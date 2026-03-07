import type { Prisma } from "@/generated/prisma/client";
import type { PendingNotification } from "@/generated/prisma/client";
import {
  deletePendingNotifications,
  getUserConfig,
  createWorkflowRun,
  updateWorkflowRun,
  createArtifact,
} from "@/lib/db/scoped-queries";
import { callOpenRouter } from "@/lib/ai/openrouter-client";
import {
  TRIAGE_CLASSIFICATION_SYSTEM_PROMPT,
  triageClassificationOutput,
  buildTriageUserContent,
  type TriageMessageInput,
} from "@/lib/ai/prompts/triage-classification";
import {
  formatTriageDigestBlocks,
  formatTriageDigestMarkdown,
  type ClassifiedMessage,
} from "@/lib/destinations/triage-formatter";
import { deliverArtifact } from "@/lib/destinations/planner";
import { decrypt } from "@/lib/crypto/encryption";

const TRIAGE_MODEL = "meta-llama/llama-3-8b-instruct";

export interface DigestProcessResult {
  userId: string;
  messageCount: number;
  success: boolean;
  error?: string;
}

/**
 * Process a triage digest for a single user's pending notifications.
 * Shared between the cron endpoint and the manual trigger.
 */
export async function processUserDigest(
  userId: string,
  notifications: PendingNotification[],
  triggerType: "CRON" | "MANUAL" = "CRON"
): Promise<DigestProcessResult> {
  const config = await getUserConfig(userId);

  // Resolve API key
  let apiKey: string;
  if (config?.encryptedOpenRouterKey) {
    apiKey = decrypt(config.encryptedOpenRouterKey);
  } else if (process.env.OPENROUTER_API_KEY) {
    apiKey = process.env.OPENROUTER_API_KEY;
  } else {
    return {
      userId,
      messageCount: notifications.length,
      success: false,
      error: "No OpenRouter API key available",
    };
  }

  const digestTime = new Date().toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    hour12: true,
  });

  // Build message array for LLM
  const messages: TriageMessageInput[] = notifications.map((n) => ({
    id: n.id,
    author: n.authorName,
    content: n.content,
    source: n.connectorId,
    channel: (n.metadata as Record<string, unknown>)?.channel as
      | string
      | undefined,
  }));

  // Call LLM for classification
  const response = await callOpenRouter({
    apiKey,
    model: TRIAGE_MODEL,
    systemPrompt: TRIAGE_CLASSIFICATION_SYSTEM_PROMPT,
    userContent: buildTriageUserContent(messages),
    responseFormat: "json_object",
  });

  // Parse and validate
  let parsed;
  try {
    parsed = triageClassificationOutput.parse(JSON.parse(response.content));
  } catch {
    const retryResponse = await callOpenRouter({
      apiKey,
      model: TRIAGE_MODEL,
      systemPrompt:
        TRIAGE_CLASSIFICATION_SYSTEM_PROMPT +
        "\n\nIMPORTANT: Your previous response was invalid JSON. Output ONLY a valid JSON object matching the exact schema above.",
      userContent: buildTriageUserContent(messages),
      responseFormat: "json_object",
    });
    parsed = triageClassificationOutput.parse(
      JSON.parse(retryResponse.content)
    );
  }

  // Build classified messages with metadata
  const classificationMap = new Map(
    parsed.classifications.map((c) => [c.id, c])
  );

  const classifiedMessages: ClassifiedMessage[] = notifications.map((n) => {
    const classification = classificationMap.get(n.id);
    const metadata = n.metadata as Record<string, unknown> | null;
    return {
      id: n.id,
      author: n.authorName,
      content: n.content,
      source: n.connectorId,
      channel: metadata?.channel as string | undefined,
      permalink: metadata?.permalink as string | undefined,
      category: classification?.category ?? "READ_ONLY",
      reason: classification?.reason ?? "Unclassified",
    };
  });

  // Create WorkflowRun
  const workflowRun = await createWorkflowRun({
    userId,
    workflowType: "SCHEDULED_DIGEST",
    triggerType,
    status: "PROCESSING",
    inputRefJson: {
      notificationCount: notifications.length,
      connectors: [...new Set(notifications.map((n) => n.connectorId))],
    },
  });

  // Format digest content
  const blocks = formatTriageDigestBlocks(classifiedMessages, digestTime);
  const markdownContent = formatTriageDigestMarkdown(
    classifiedMessages,
    digestTime
  );

  // Create Artifact
  const artifact = await createArtifact({
    userId,
    artifactType: "DIGEST",
    workflowRunId: workflowRun.id,
    title: `Triage Digest — ${digestTime}`,
    summaryText: markdownContent,
    payloadJson: {
      classifications: parsed.classifications,
      messages: classifiedMessages,
      blocks,
      digestTime,
    } as unknown as Prisma.InputJsonValue,
  });

  // Deliver via planner
  await deliverArtifact(
    {
      id: artifact.id,
      artifactType: "DIGEST",
      title: artifact.title,
      summaryText: artifact.summaryText,
      payloadJson: artifact.payloadJson as Record<string, unknown> | null,
      sourceRefsJson: null,
    },
    userId
  );

  // Update workflow run status
  await updateWorkflowRun(workflowRun.id, {
    status: "COMPLETED",
    completedAt: new Date(),
    modelUsed: response.model,
    metricsJson: {
      messageCount: notifications.length,
      actionRequired: classifiedMessages.filter(
        (m) => m.category === "ACTION_REQUIRED"
      ).length,
      readOnly: classifiedMessages.filter((m) => m.category === "READ_ONLY")
        .length,
      noise: classifiedMessages.filter((m) => m.category === "NOISE").length,
    },
  });

  // Clean up processed notifications
  await deletePendingNotifications(notifications.map((n) => n.id));

  console.log(
    JSON.stringify({
      level: "info",
      event: "triage_digest_sent",
      userId,
      triggerType,
      messageCount: notifications.length,
    })
  );

  return {
    userId,
    messageCount: notifications.length,
    success: true,
  };
}

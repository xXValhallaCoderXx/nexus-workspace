import type { WorkflowHandler, WorkflowInput, WorkflowOutput } from "./types";
import { callOpenRouter } from "@/lib/ai/openrouter-client";
import {
  MEETING_SUMMARY_SYSTEM_PROMPT,
  meetingSummarySchema,
} from "@/lib/ai/prompts/meeting-summary";
import { fetchTranscriptContent } from "@/lib/google/fetch-transcript";
import { getUserConfig } from "@/lib/db/scoped-queries";
import { decrypt } from "@/lib/crypto/encryption";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export class MeetingSummaryHandler implements WorkflowHandler {
  readonly workflowType = "MEETING_SUMMARY" as const;

  canHandle(input: WorkflowInput): boolean {
    const refs = input.inputRefs as { fileId?: string };
    return !!refs.fileId;
  }

  async execute(input: WorkflowInput): Promise<WorkflowOutput> {
    const { userId, inputRefs } = input;
    const { fileId } = inputRefs as { fileId: string; fileName?: string };

    // Fetch transcript
    const transcript = await fetchTranscriptContent(userId, fileId);
    const config = await getUserConfig(userId);

    // Resolve API key
    let apiKey: string;
    if (config?.encryptedOpenRouterKey) {
      apiKey = decrypt(config.encryptedOpenRouterKey);
    } else if (process.env.OPENROUTER_API_KEY) {
      apiKey = process.env.OPENROUTER_API_KEY;
    } else {
      throw new Error("No OpenRouter API key available");
    }

    // Call LLM
    const systemPrompt =
      config?.customSystemPrompt || MEETING_SUMMARY_SYSTEM_PROMPT;
    let response = await callOpenRouter({
      apiKey,
      model: DEFAULT_MODEL,
      systemPrompt,
      userContent: transcript.content,
      responseFormat: "json_object",
    });

    // Parse and validate
    let parsed;
    try {
      parsed = meetingSummarySchema.parse(JSON.parse(response.content));
    } catch {
      // Retry once with stricter prompt
      response = await callOpenRouter({
        apiKey,
        model: DEFAULT_MODEL,
        systemPrompt:
          systemPrompt +
          "\n\nIMPORTANT: Your previous response was invalid JSON. Output ONLY a valid JSON object matching the exact schema above.",
        userContent: transcript.content,
        responseFormat: "json_object",
      });
      parsed = meetingSummarySchema.parse(JSON.parse(response.content));
    }

    return {
      artifactType: "MEETING_SUMMARY",
      title: parsed.title,
      summaryText: parsed.summary,
      payloadJson: parsed as unknown as Record<string, unknown>,
      sourceRefsJson: {
        fileId,
        fileName: transcript.fileName,
        mimeType: transcript.mimeType,
        createdTime: transcript.createdTime,
      },
      modelUsed: response.model,
    };
  }
}

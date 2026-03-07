import { callOpenRouter } from "./openrouter-client";
import {
  MEETING_SUMMARY_SYSTEM_PROMPT,
  meetingSummarySchema,
  type MeetingSummaryOutput,
} from "./prompts/meeting-summary";
import { fetchTranscriptContent } from "@/lib/google/fetch-transcript";
import { getUserConfig } from "@/lib/db/scoped-queries";
import { decrypt } from "@/lib/crypto/encryption";
import { deliverToAllDestinations } from "@/lib/destinations/router";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export interface ProcessingResult {
  payload: MeetingSummaryOutput;
  model: string;
  destinations: string[];
}

export async function processMeetingTranscript(
  userId: string,
  fileId: string,
  summaryId?: string
): Promise<ProcessingResult> {
  const transcript = await fetchTranscriptContent(userId, fileId);
  const config = await getUserConfig(userId);

  // Resolve API key: BYOK or global
  let apiKey: string;
  if (config?.encryptedOpenRouterKey) {
    apiKey = decrypt(config.encryptedOpenRouterKey);
  } else if (process.env.OPENROUTER_API_KEY) {
    apiKey = process.env.OPENROUTER_API_KEY;
  } else {
    throw new Error("No OpenRouter API key available");
  }

  // Call LLM
  const systemPrompt = config?.customSystemPrompt || MEETING_SUMMARY_SYSTEM_PROMPT;
  let response = await callOpenRouter({
    apiKey,
    model: DEFAULT_MODEL,
    systemPrompt,
    userContent: transcript.content,
    responseFormat: "json_object",
  });

  // Parse and validate
  let parsed: MeetingSummaryOutput;
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

  // Deliver to all enabled destinations
  const deliveredTo = summaryId
    ? await deliverToAllDestinations(parsed, userId, summaryId)
    : await (async () => {
        // Legacy fallback when no summaryId
        const { getEnabledDestinations, getDestinationProvider } = await import("@/lib/destinations/router");
        const dests = getEnabledDestinations(config);
        const results: string[] = [];
        for (const dest of dests) {
          const provider = getDestinationProvider(dest);
          const result = await provider.deliver(parsed, userId);
          if (result.success) results.push(dest);
        }
        return results.length > 0 ? results : ["DATABASE"];
      })();

  return {
    payload: parsed,
    model: response.model,
    destinations: deliveredTo,
  };
}

import { callOpenRouter } from "./openrouter-client";
import {
  MEETING_SUMMARY_SYSTEM_PROMPT,
  meetingSummarySchema,
  type MeetingSummaryOutput,
} from "./prompts/meeting-summary";
import { fetchTranscriptContent } from "@/lib/google/fetch-transcript";
import { getUserConfig } from "@/lib/db/scoped-queries";
import { decrypt } from "@/lib/crypto/encryption";
import { getDestinationProvider } from "@/lib/destinations/router";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export interface ProcessingResult {
  payload: MeetingSummaryOutput;
  model: string;
  destination: string;
}

export async function processMeetingTranscript(
  userId: string,
  fileId: string
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

  // Deliver to destination
  const destinationType = config?.selectedDestination ?? "DATABASE";
  const provider = getDestinationProvider(destinationType);
  await provider.deliver(parsed, userId);

  return {
    payload: parsed,
    model: response.model,
    destination: destinationType,
  };
}

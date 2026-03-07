import { z } from "zod/v4";

export const TRIAGE_CLASSIFICATION_SYSTEM_PROMPT = `
You are a message triage assistant. Given a JSON array of chat messages, classify each one into exactly one of three categories:

- ACTION_REQUIRED — The message requires a response or action from the reader. This includes blocking questions, urgent requests, direct asks, approval requests, and anything where someone is waiting on a reply. When in doubt about whether a direct question needs action, err on the side of ACTION_REQUIRED.
- READ_ONLY — The message is informational and worth reading but does not require a response. This includes PR reviews, FYI announcements, status updates, deployment notifications, and shared links or documents.
- NOISE — The message can be safely ignored or is low-value. This includes bot-generated noise, emoji reactions, casual chatter unrelated to work, duplicate messages, and automated alerts with no actionable content.

Each input message has the following fields:
- id: unique identifier
- author: who sent the message
- content: the message text
- source: the platform the message came from
- channel: (optional) the channel or conversation name

Output a JSON object with a single key "classifications" containing an array. Each item in the array must have:
- id: the matching id from the input message
- category: one of ACTION_REQUIRED, READ_ONLY, or NOISE
- reason: a brief 1-sentence justification for the classification

Output ONLY valid JSON, no markdown code fences or other text.
`.trim();

export const triageCategory = z.enum(["ACTION_REQUIRED", "READ_ONLY", "NOISE"]);
export type TriageCategory = z.infer<typeof triageCategory>;

export const triageClassificationItem = z.object({
  id: z.string(),
  category: triageCategory,
  reason: z.string(),
});

export const triageClassificationOutput = z.object({
  classifications: z.array(triageClassificationItem),
});

export type TriageClassificationOutput = z.infer<
  typeof triageClassificationOutput
>;

export interface TriageMessageInput {
  id: string;
  author: string;
  content: string;
  source: string;
  channel?: string;
}

/** Max characters per individual message sent to the LLM */
const MAX_MESSAGE_CHARS = 1_000;
/** Max total characters for the entire user content payload */
const MAX_PAYLOAD_CHARS = 30_000;
/** Max messages per LLM call */
export const MAX_MESSAGES_PER_BATCH = 50;

export function buildTriageUserContent(
  messages: TriageMessageInput[],
): string {
  const capped = messages.slice(0, MAX_MESSAGES_PER_BATCH);

  const truncated = capped.map((m) => ({
    ...m,
    content:
      m.content.length > MAX_MESSAGE_CHARS
        ? m.content.slice(0, MAX_MESSAGE_CHARS) + "…[truncated]"
        : m.content,
  }));

  let payload = JSON.stringify(truncated);

  // If still too large, progressively shorten content
  if (payload.length > MAX_PAYLOAD_CHARS) {
    const shortened = truncated.map((m) => ({
      ...m,
      content: m.content.slice(0, 300) + "…[truncated]",
    }));
    payload = JSON.stringify(shortened);
  }

  return payload;
}

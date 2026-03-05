import { z } from "zod/v4";
import { getQStash } from "./client";

export const transcriptJobPayloadSchema = z.object({
  userId: z.string(),
  fileId: z.string(),
  fileName: z.string().optional(),
  resourceId: z.string().optional(),
  channelId: z.string().optional(),
});

export type TranscriptJobPayload = z.infer<typeof transcriptJobPayloadSchema>;

export async function enqueueTranscriptJob(payload: TranscriptJobPayload) {
  transcriptJobPayloadSchema.parse(payload);

  const webhookUrl = process.env.WEBHOOK_BASE_URL;
  if (!webhookUrl) {
    throw new Error("WEBHOOK_BASE_URL environment variable is not set");
  }

  return getQStash().publishJSON({
    url: `${webhookUrl}/api/workers/process-transcript`,
    body: payload,
    retries: 3,
    deadLetterQueue: `${webhookUrl}/api/workers/dead-letter`,
  });
}

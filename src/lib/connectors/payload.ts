// ──────────────────────────────────────────────
// Canonical Meeting Summary Payload (spec §1.2)
// ──────────────────────────────────────────────
// Produced by the summarisation pipeline, consumed by all connectors.
// Each connector transforms this into its destination's native format.

import { z } from "zod/v4";

export const attendeeSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
});

export const actionItemSchema = z.object({
  owner: z.string(),
  task: z.string(),
  ownerEmail: z.string().optional(),
  deadline: z.string().nullable().optional(),
});

export const meetingSummaryPayloadSchema = z.object({
  // Identity
  summaryId: z.string(),
  meetingTitle: z.string(),
  meetingDate: z.string(),
  meetingDuration: z.number().optional(),
  sourceType: z.enum(["google_meet", "drive_manual"]),
  sourceFileId: z.string(),

  // Participants
  attendees: z.array(attendeeSchema),

  // Summary content
  summary: z.string(),
  topics: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(actionItemSchema),
  followUps: z.array(z.string()),

  // Metadata
  processedAt: z.string(),
  modelUsed: z.string(),
  nexusUrl: z.string(),
});

export type MeetingSummaryPayload = z.infer<typeof meetingSummaryPayloadSchema>;

export type Attendee = z.infer<typeof attendeeSchema>;

/**
 * Convert the legacy MeetingSummaryOutput (from AI) into the canonical payload.
 * Bridges the gap between what the LLM produces and what connectors consume.
 */
export function buildPayloadFromLegacy(
  legacyOutput: {
    title: string;
    date?: string | null;
    attendees: string[];
    summary: string;
    actionItems: Array<{ owner: string; task: string; deadline?: string | null }>;
    decisions: string[];
    followUps: string[];
  },
  meta: {
    summaryId: string;
    sourceFileId: string;
    modelUsed: string;
    nexusBaseUrl: string;
  }
): MeetingSummaryPayload {
  return {
    summaryId: meta.summaryId,
    meetingTitle: legacyOutput.title,
    meetingDate: legacyOutput.date ?? new Date().toISOString(),
    sourceType: "google_meet",
    sourceFileId: meta.sourceFileId,
    attendees: legacyOutput.attendees.map((name) => ({ name })),
    summary: legacyOutput.summary,
    topics: [],
    decisions: legacyOutput.decisions,
    actionItems: legacyOutput.actionItems.map((ai) => ({
      owner: ai.owner,
      task: ai.task,
      deadline: ai.deadline,
    })),
    followUps: legacyOutput.followUps,
    processedAt: new Date().toISOString(),
    modelUsed: meta.modelUsed,
    nexusUrl: `${meta.nexusBaseUrl}/dashboard?note=${meta.summaryId}`,
  };
}

import { z } from "zod/v4";

export const MEETING_SUMMARY_SYSTEM_PROMPT = `
You are a meeting analyst. Given a raw meeting transcript, produce a structured JSON summary.

Output the following JSON structure:
{
  "title": "Brief meeting title",
  "date": "Meeting date if mentioned",
  "attendees": ["List of participants mentioned"],
  "summary": "2-3 paragraph executive summary",
  "actionItems": [
    { "owner": "Person name", "task": "Description", "deadline": "If mentioned" }
  ],
  "decisions": ["Key decisions made during the meeting"],
  "followUps": ["Items that need follow-up"]
}

Be concise. Only include information explicitly stated in the transcript.
Output ONLY valid JSON, no markdown code fences or other text.
`.trim();

export const actionItemSchema = z.object({
  owner: z.string(),
  task: z.string(),
  deadline: z.string().nullable().optional(),
});

export const meetingSummarySchema = z.object({
  title: z.string(),
  date: z.string().nullable().optional(),
  attendees: z.array(z.string()),
  summary: z.string(),
  actionItems: z.array(actionItemSchema),
  decisions: z.array(z.string()),
  followUps: z.array(z.string()),
});

export type MeetingSummaryOutput = z.infer<typeof meetingSummarySchema>;

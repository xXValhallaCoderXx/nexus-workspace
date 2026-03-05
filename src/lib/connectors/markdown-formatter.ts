// ──────────────────────────────────────────────
// Shared Markdown Formatter (spec §3.4 note)
// ──────────────────────────────────────────────
// Both Attio and ClickUp accept markdown. This utility
// transforms the canonical payload into a formatted summary.

import type { MeetingSummaryPayload } from "./payload";

export function formatSummaryAsMarkdown(payload: MeetingSummaryPayload): string {
  const lines: string[] = [];

  lines.push(`# ${payload.meetingTitle}`);
  lines.push("");
  lines.push(`**Date:** ${payload.meetingDate}`);

  if (payload.attendees.length > 0) {
    const names = payload.attendees.map((a) => a.name).join(", ");
    lines.push(`**Attendees:** ${names}`);
  }

  if (payload.meetingDuration) {
    lines.push(`**Duration:** ${payload.meetingDuration} minutes`);
  }

  lines.push(`**Source:** [View in Nexus](${payload.nexusUrl})`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(payload.summary);
  lines.push("");

  // Topics
  if (payload.topics.length > 0) {
    lines.push("## Key Topics");
    lines.push("");
    for (const topic of payload.topics) {
      lines.push(`- ${topic}`);
    }
    lines.push("");
  }

  // Decisions
  if (payload.decisions.length > 0) {
    lines.push("## Decisions");
    lines.push("");
    for (const decision of payload.decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  // Action Items
  if (payload.actionItems.length > 0) {
    lines.push("## Action Items");
    lines.push("");
    for (const item of payload.actionItems) {
      const deadline = item.deadline ? ` (by ${item.deadline})` : "";
      lines.push(`- **${item.owner}:** ${item.task}${deadline}`);
    }
    lines.push("");
  }

  // Follow-Ups
  if (payload.followUps.length > 0) {
    lines.push("## Follow-Ups");
    lines.push("");
    for (const followUp of payload.followUps) {
      lines.push(`- ${followUp}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

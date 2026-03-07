export interface MarkdownPayload {
  meetingTitle: string;
  meetingDate: string;
  meetingDuration?: number;
  attendees: Array<{ name: string; email?: string }>;
  summary: string;
  topics: string[];
  decisions: string[];
  actionItems: Array<{
    owner: string;
    task: string;
    ownerEmail?: string;
    deadline?: string | null;
  }>;
  followUps: string[];
  sourceFileId: string;
  nexusUrl: string;
}

export function formatSummaryAsMarkdown(payload: MarkdownPayload): string {
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

  if (payload.sourceFileId) {
    lines.push(
      `**Transcript:** [View in Google Drive](https://drive.google.com/file/d/${payload.sourceFileId}/view)`
    );
  }
  lines.push(`**Source:** [View in Nexus](${payload.nexusUrl})`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(payload.summary);
  lines.push("");

  if (payload.topics.length > 0) {
    lines.push("## Key Topics");
    lines.push("");
    for (const topic of payload.topics) {
      lines.push(`- ${topic}`);
    }
    lines.push("");
  }

  if (payload.decisions.length > 0) {
    lines.push("## Decisions");
    lines.push("");
    for (const decision of payload.decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  if (payload.actionItems.length > 0) {
    lines.push("## Action Items");
    lines.push("");
    for (const item of payload.actionItems) {
      const deadline = item.deadline ? ` (by ${item.deadline})` : "";
      lines.push(`- **${item.owner}:** ${item.task}${deadline}`);
    }
    lines.push("");
  }

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

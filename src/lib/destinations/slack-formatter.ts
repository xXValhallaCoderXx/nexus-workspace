export interface SlackFormatInput {
  title: string;
  date?: string | null;
  attendees: string[];
  summary: string;
  actionItems: Array<{ owner: string; task: string; deadline?: string | null }>;
  decisions: string[];
  followUps: string[];
}

export function formatSlackBlocks(summary: SlackFormatInput) {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: summary.title, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: summary.summary },
    },
  ];

  if (summary.date || summary.attendees.length > 0) {
    const fields: Array<{ type: string; text: string }> = [];
    if (summary.date) {
      fields.push({ type: "mrkdwn", text: `*Date:* ${summary.date}` });
    }
    if (summary.attendees.length > 0) {
      fields.push({
        type: "mrkdwn",
        text: `*Attendees:* ${summary.attendees.join(", ")}`,
      });
    }
    blocks.push({ type: "section", fields });
  }

  if (summary.actionItems.length > 0) {
    blocks.push({ type: "divider" });
    const items = summary.actionItems
      .map(
        (item) =>
          `• *${item.owner}*: ${item.task}${item.deadline ? ` _(by ${item.deadline})_` : ""}`
      )
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Action Items*\n${items}` },
    });
  }

  if (summary.decisions.length > 0) {
    blocks.push({ type: "divider" });
    const decisions = summary.decisions.map((d) => `• ${d}`).join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Decisions*\n${decisions}` },
    });
  }

  if (summary.followUps.length > 0) {
    const followUps = summary.followUps.map((f) => `• ${f}`).join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Follow-ups*\n${followUps}` },
    });
  }

  return blocks;
}

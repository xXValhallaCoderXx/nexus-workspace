import type { TriageCategory } from "@/lib/ai/prompts/triage-classification";

export interface ClassifiedMessage {
  id: string;
  author: string;
  content: string;
  source: string;
  channel?: string;
  permalink?: string;
  category: TriageCategory;
  reason: string;
}

interface DigestSection {
  emoji: string;
  label: string;
  category: TriageCategory;
}

const SECTIONS: DigestSection[] = [
  { emoji: "🔴", label: "Action Required", category: "ACTION_REQUIRED" },
  { emoji: "📖", label: "Read Only", category: "READ_ONLY" },
  { emoji: "🔇", label: "Noise", category: "NOISE" },
];

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

function formatMessageLine(msg: ClassifiedMessage): string {
  const author = `*${msg.author}*`;
  const content = truncate(msg.content, 120);
  const link = msg.permalink ? ` — <${msg.permalink}|View>` : "";
  const source = msg.channel ? `#${msg.channel}` : msg.source;
  return `• ${author} in ${source}: ${content}${link}`;
}

/**
 * Format classified messages as Slack Block Kit blocks for a triage digest.
 */
export function formatTriageDigestBlocks(
  messages: ClassifiedMessage[],
  digestTime: string
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📬 Triage Digest — ${digestTime}`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${messages.length} message${messages.length === 1 ? "" : "s"} triaged across your connected platforms`,
        },
      ],
    },
  ];

  for (const section of SECTIONS) {
    const sectionMessages = messages.filter(
      (m) => m.category === section.category
    );
    if (sectionMessages.length === 0) continue;

    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${section.emoji} *${section.label}* (${sectionMessages.length})`,
      },
    });

    const lines = sectionMessages.map(formatMessageLine).join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: lines },
    });
  }

  if (messages.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "✨ No new mentions since your last digest. Enjoy the focus time!",
      },
    });
  }

  return blocks;
}

/**
 * Format classified messages as plain markdown (for non-Slack destinations).
 */
export function formatTriageDigestMarkdown(
  messages: ClassifiedMessage[],
  digestTime: string
): string {
  const lines: string[] = [
    `# 📬 Triage Digest — ${digestTime}`,
    "",
    `${messages.length} message${messages.length === 1 ? "" : "s"} triaged across your connected platforms.`,
    "",
  ];

  for (const section of SECTIONS) {
    const sectionMessages = messages.filter(
      (m) => m.category === section.category
    );
    if (sectionMessages.length === 0) continue;

    lines.push(`## ${section.emoji} ${section.label} (${sectionMessages.length})`);
    lines.push("");

    for (const msg of sectionMessages) {
      const link = msg.permalink ? ` — [View](${msg.permalink})` : "";
      const source = msg.channel ? `#${msg.channel}` : msg.source;
      lines.push(
        `- **${msg.author}** in ${source}: ${truncate(msg.content, 120)}${link}`
      );
    }
    lines.push("");
  }

  if (messages.length === 0) {
    lines.push(
      "✨ No new mentions since your last digest. Enjoy the focus time!"
    );
  }

  return lines.join("\n");
}

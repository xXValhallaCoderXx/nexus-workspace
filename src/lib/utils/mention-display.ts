import { type DeliveryPreview, truncateText } from "@/lib/utils/workflow-run-display";

export type MentionCategory = "ACTION_REQUIRED" | "READ_ONLY" | "NOISE";

export interface MentionListItem {
  id: string;
  digestRunId: string;
  digestTitle: string;
  digestTimeLabel: string;
  processedAt: string;
  author: string;
  content: string;
  source: string;
  category: MentionCategory;
  reason: string;
  permalink: string | null;
  deliveries: DeliveryPreview[];
}

const mentionCategoryMeta = {
  ACTION_REQUIRED: {
    label: "Action required",
    description: "Needs a response soon",
    chipClassName: "border-[#FECACA] bg-red-lt text-red",
    cardAccentClassName: "border-[#FECACA]/80",
  },
  READ_ONLY: {
    label: "Review",
    description: "Worth reading, no immediate action",
    chipClassName: "border-[#C7D2FE] bg-[#EEF2FF] text-[#4338CA]",
    cardAccentClassName: "border-[#C7D2FE]",
  },
  NOISE: {
    label: "Noise",
    description: "Low-signal mention",
    chipClassName: "border-border bg-bg text-muted",
    cardAccentClassName: "border-border",
  },
} as const;

const mentionSourceMeta = {
  slack: {
    label: "Slack",
    shortLabel: "S",
    avatarClassName: "bg-[#4A154B] text-white",
  },
} as const;

export function getMentionCategoryMeta(category: MentionCategory) {
  return mentionCategoryMeta[category];
}

export function getMentionCategoryOrder(category: MentionCategory) {
  if (category === "ACTION_REQUIRED") return 0;
  if (category === "READ_ONLY") return 1;
  return 2;
}

export function getMentionSourceMeta(source: string) {
  return (
    mentionSourceMeta[source.toLowerCase() as keyof typeof mentionSourceMeta] ?? {
      label: source,
      shortLabel: source.slice(0, 1).toUpperCase() || "?",
      avatarClassName: "bg-brand text-white",
    }
  );
}

export function formatSlackMessageText(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<!here>/g, "@here")
    .replace(/<!channel>/g, "@channel")
    .replace(/<!everyone>/g, "@everyone")
    .replace(/<@[^>|]+(?:\|([^>]+))?>/g, (_match, label: string | undefined) =>
      label ? `@${label}` : "@mention"
    )
    .replace(/<#[^>|]+\|([^>]+)>/g, (_match, label: string) => `#${label}`)
    .replace(/<([^>|]+)\|([^>]+)>/g, (_match, _target: string, label: string) => label)
    .replace(/<([^>]+)>/g, "$1");
}

export function getMentionTitle(item: Pick<MentionListItem, "content" | "author">) {
  const firstLine = formatSlackMessageText(item.content)
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  const cleaned = (firstLine ?? "")
    .replace(/^@mention[:,\s-]*/i, "")
    .trim();

  return truncateText(cleaned || `Mention from ${item.author}`, 82);
}

export function getMentionPreviewText(content: string, maxLength = 180) {
  return truncateText(formatSlackMessageText(content), maxLength);
}

export function matchesMentionQuery(item: MentionListItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystack = [
    item.author,
    item.source,
    getMentionSourceMeta(item.source).label,
    getMentionCategoryMeta(item.category).label,
    item.reason,
    item.digestTitle,
    formatSlackMessageText(item.content),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

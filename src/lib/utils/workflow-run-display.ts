export interface MeetingSummaryPayload {
  title: string;
  date?: string;
  attendees: string[];
  summary: string;
  actionItems: Array<{ owner: string; task: string; deadline?: string }>;
  decisions: string[];
  followUps: string[];
}

export interface DigestMessage {
  id: string;
  author: string;
  content: string;
  source: string;
  channel?: string;
  permalink?: string;
  category: "ACTION_REQUIRED" | "READ_ONLY" | "NOISE";
  reason: string;
}

export interface DigestPayload {
  classifications: Array<{
    id: string;
    category: "ACTION_REQUIRED" | "READ_ONLY" | "NOISE";
    reason: string;
  }>;
  messages: DigestMessage[];
  blocks: Record<string, unknown>[];
  digestTime: string;
}

export interface DeliveryPreview {
  provider: string;
  status: string;
  externalUrl?: string | null;
  deliveredAt?: string | null;
  errorMessage?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isDigestPayload(payload: unknown): payload is DigestPayload {
  return (
    isRecord(payload) &&
    Array.isArray(payload.messages) &&
    Array.isArray(payload.classifications)
  );
}

export function isMeetingSummaryPayload(
  payload: unknown
): payload is MeetingSummaryPayload {
  return (
    isRecord(payload) &&
    typeof payload.summary === "string" &&
    Array.isArray(payload.actionItems) &&
    Array.isArray(payload.decisions) &&
    Array.isArray(payload.followUps)
  );
}

function pluralize(label: string, count: number) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function getRelativeCalendarLabel(date: Date) {
  if (!isValidDate(date)) return "Unknown date";

  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const dayDiff = Math.round(
    (startOfToday.getTime() - target.getTime()) / 86_400_000
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function formatRelativeDay(iso: string) {
  return getRelativeCalendarLabel(new Date(iso));
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  if (!isValidDate(date)) return "Unknown time";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeDateTime(iso: string) {
  return `${formatRelativeDay(iso)} · ${formatTime(iso)}`;
}

export function formatLongDateTime(iso: string) {
  const date = new Date(iso);
  if (!isValidDate(date)) return "Unknown date";

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${formatTime(iso)}`;
}

export function truncateText(text: string, maxLength = 140) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getWorkflowKindLabel(workflowType: string) {
  if (workflowType === "SCHEDULED_DIGEST") return "Digest";
  if (workflowType === "MEETING_SUMMARY") return "Meeting";
  return "Workflow";
}

export function getWorkflowPreview(workflowType: string, payload: unknown) {
  if (workflowType === "SCHEDULED_DIGEST" && isDigestPayload(payload)) {
    const categoryCount = new Set(payload.messages.map((message) => message.category))
      .size;

    return `${pluralize("message", payload.messages.length)} classified across ${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}.`;
  }

  if (isMeetingSummaryPayload(payload) && payload.summary.trim()) {
    return truncateText(payload.summary);
  }

  return null;
}

export function getWorkflowInsightBadges(workflowType: string, payload: unknown) {
  if (workflowType === "SCHEDULED_DIGEST" && isDigestPayload(payload)) {
    const actionRequired = payload.messages.filter(
      (message) => message.category === "ACTION_REQUIRED"
    ).length;
    const readOnly = payload.messages.filter(
      (message) => message.category === "READ_ONLY"
    ).length;
    const noise = payload.messages.filter(
      (message) => message.category === "NOISE"
    ).length;

    return [
      pluralize("message", payload.messages.length),
      actionRequired > 0 ? pluralize("action item", actionRequired) : null,
      readOnly > 0 ? pluralize("read-only item", readOnly) : null,
      noise > 0 ? pluralize("noise item", noise) : null,
    ].filter((value): value is string => Boolean(value));
  }

  if (isMeetingSummaryPayload(payload)) {
    return [
      payload.attendees.length > 0
        ? pluralize("attendee", payload.attendees.length)
        : null,
      payload.actionItems.length > 0
        ? pluralize("action item", payload.actionItems.length)
        : null,
      payload.decisions.length > 0
        ? pluralize("decision", payload.decisions.length)
        : null,
      payload.followUps.length > 0
        ? pluralize("follow-up", payload.followUps.length)
        : null,
    ].filter((value): value is string => Boolean(value));
  }

  return [];
}

export function getDeliveryStatus(status: string): "delivered" | "failed" | "pending" {
  if (status === "DELIVERED") return "delivered";
  if (status === "FAILED") return "failed";
  return "pending";
}

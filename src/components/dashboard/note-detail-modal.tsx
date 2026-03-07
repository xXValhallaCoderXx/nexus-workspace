"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DestinationBadge,
  WorkflowRunIcon,
  getProviderLabel,
} from "@/components/dashboard/workflow-run-primitives";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { cleanMeetingTitle } from "@/lib/utils/clean-meeting-title";
import {
  formatLongDateTime,
  getDeliveryStatus,
  getWorkflowInsightBadges,
  isDigestPayload,
  isMeetingSummaryPayload,
  truncateText,
  type DigestMessage,
  type DigestPayload,
  type MeetingSummaryPayload,
} from "@/lib/utils/workflow-run-display";

interface DeliveryLogEntry {
  id: string;
  connectorId: string;
  status: string;
  errorMessage: string | null;
  externalUrl: string | null;
  deliveredAt: string | null;
  retryCount: number;
}

interface JobResponse {
  id: string;
  sourceFileId: string;
  sourceFileName: string | null;
  status: string;
  resultPayload: MeetingSummaryPayload | DigestPayload | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  deliveryLogs?: DeliveryLogEntry[];
}

const statusMap: Record<
  string,
  { variant: "ready" | "processing" | "failed" | "pending"; label: string }
> = {
  COMPLETED: { variant: "ready", label: "Ready" },
  PROCESSING: { variant: "processing", label: "Processing" },
  FAILED: { variant: "failed", label: "Failed" },
  PENDING: { variant: "pending", label: "Pending" },
};

const deliveryStateClassNames = {
  delivered: "bg-[#F0FDF4] text-[#15803D]",
  failed: "bg-[#FEF2F2] text-red",
  pending: "bg-[#FFFBEB] text-[#B45309]",
} as const;

const categoryConfig = {
  ACTION_REQUIRED: {
    label: "Action Required",
    badgeClassName: "bg-red-lt text-red",
  },
  READ_ONLY: {
    label: "Read Only",
    badgeClassName: "bg-amber-lt text-[#B45309]",
  },
  NOISE: {
    label: "Noise",
    badgeClassName: "bg-bg text-muted",
  },
} as const;

export function NoteDetailModal({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: () => void;
}) {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setJob(null);

    fetch(`/api/user/jobs/${encodeURIComponent(jobId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to load note");
        }
        return res.json();
      })
      .then((data: JobResponse) => {
        if (!cancelled) {
          setJob(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load note");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleRetry() {
    if (!job) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/user/drive/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: job.sourceFileId,
          fileName: job.sourceFileName,
        }),
      });
      if (res.ok) {
        onClose();
        window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }

  const payload = job?.resultPayload ?? null;
  const digest = isDigestPayload(payload) ? payload : null;
  const meeting = isMeetingSummaryPayload(payload) ? payload : null;
  const workflowType = digest ? "SCHEDULED_DIGEST" : "MEETING_SUMMARY";
  const statusInfo = statusMap[job?.status ?? "PENDING"] ?? statusMap.PENDING;
  const title = job
    ? digest
      ? job.sourceFileName ?? "Triage Digest"
      : meeting?.title ?? cleanMeetingTitle(job.sourceFileName)
    : "Meeting details";
  const insightBadges = job
    ? getWorkflowInsightBadges(workflowType, job.resultPayload)
    : [];

  return (
    <Modal
      open={!!jobId}
      onClose={onClose}
      variant="side"
      bodyClassName="min-h-0 flex-1 overflow-y-auto bg-bg p-6"
      headerContent={
        <div className="border-b border-border bg-surface px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    digest ? "bg-[#F5F3FF] text-[#7C3AED]" : "bg-brand-lt text-brand"
                  }`}
                >
                  {digest ? "Triage digest" : "Meeting summary"}
                </span>
                <span>{job ? formatLongDateTime(job.createdAt) : "Loading details..."}</span>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <WorkflowRunIcon
                  workflowType={workflowType}
                  status={job?.status ?? "PENDING"}
                  size="md"
                />
                <div className="min-w-0">
                  <h2 className="text-[28px] font-bold leading-tight tracking-tight text-text">
                    {title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
                    {insightBadges.slice(0, 3).map((insight) => (
                      <span
                        key={insight}
                        className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-medium text-muted"
                      >
                        {insight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface2 text-muted transition-colors hover:text-text"
              aria-label="Close details"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : error ? (
        <section className="rounded-[22px] border border-[#FECACA] bg-red-lt p-6 text-center">
          <p className="text-sm font-semibold text-red">Unable to load details</p>
          <p className="mt-2 text-sm text-red">{error}</p>
        </section>
      ) : digest ? (
        <div className="space-y-6">
          <DigestView payload={digest} />
          {job && <DeliverySection job={job} />}
        </div>
      ) : meeting ? (
        <div className="space-y-6">
          <SummaryView payload={meeting} />
          {job && <DeliverySection job={job} />}
        </div>
      ) : job?.status === "FAILED" ? (
        <section className="rounded-[22px] border border-[#FECACA] bg-red-lt p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red/10">
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="var(--red)"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-text">Processing failed</p>
          {job.errorMessage && <p className="mt-1 text-sm text-muted">{job.errorMessage}</p>}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {retrying ? "Retrying..." : "Retry Processing"}
          </button>
        </section>
      ) : (
        <div className="py-12 text-center text-sm text-muted2">No summary available</div>
      )}
    </Modal>
  );
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
        {label}
      </p>
      <p className="mt-2 text-[15px] font-semibold text-text">{value}</p>
      {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-border bg-surface p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryView({ payload }: { payload: MeetingSummaryPayload }) {
  const attendeePreview =
    payload.attendees.length <= 4
      ? payload.attendees.join(", ")
      : `${payload.attendees.slice(0, 4).join(", ")}, +${
          payload.attendees.length - 4
        } more`;

  return (
    <div className="space-y-6">
      {(payload.date || payload.attendees.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {payload.date && <InfoCard label="Meeting date" value={payload.date} />}
          {payload.attendees.length > 0 && (
            <InfoCard
              label="Participants"
              value={`${payload.attendees.length} attendees`}
              detail={attendeePreview}
            />
          )}
        </div>
      )}

      <section className="rounded-[22px] border border-[#D8D3FF] bg-[#F7F7FF] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-brand text-white">
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12 3 1.9 3.85L18 8.1l-3 2.92.71 4.13L12 13.4 8.29 15.15 9 11.02 6 8.1l4.1-1.25L12 3Z"
              />
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-semibold text-text">AI Summary</p>
            <p className="text-sm text-muted">
              A concise recap of the main discussion and outcomes.
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted">
          {payload.summary}
        </p>
      </section>

      {payload.decisions.length > 0 && (
        <SectionCard title="Key decisions">
          <ul className="space-y-3">
            {payload.decisions.map((decision, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-lt text-green">
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>
                </span>
                <p className="text-[15px] leading-7 text-text">{decision}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {payload.actionItems.length > 0 && (
        <SectionCard title="Action items">
          <div className="space-y-3">
            {payload.actionItems.map((item, index) => (
              <div
                key={index}
                className="rounded-[18px] border border-border bg-bg px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted">
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-text">
                      {item.owner || "Owner TBD"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.task}</p>
                    {item.deadline && (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted2">
                        Due {item.deadline}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {payload.followUps.length > 0 && (
        <SectionCard title="Follow-ups">
          <ul className="space-y-3">
            {payload.followUps.map((followUp, index) => (
              <li
                key={index}
                className="rounded-[18px] border border-border bg-bg px-4 py-4 text-[15px] leading-7 text-text"
              >
                {followUp}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function DigestView({ payload }: { payload: DigestPayload }) {
  const grouped = {
    ACTION_REQUIRED: payload.messages.filter(
      (message) => message.category === "ACTION_REQUIRED"
    ),
    READ_ONLY: payload.messages.filter(
      (message) => message.category === "READ_ONLY"
    ),
    NOISE: payload.messages.filter((message) => message.category === "NOISE"),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoCard
          label="Mentions"
          value={String(payload.messages.length)}
          detail="Messages included in this digest"
        />
        <InfoCard
          label="Action required"
          value={String(grouped.ACTION_REQUIRED.length)}
          detail="Items that need a response"
        />
        <InfoCard
          label="Read only"
          value={String(grouped.READ_ONLY.length)}
          detail="Useful context with no action"
        />
      </div>

      {(["ACTION_REQUIRED", "READ_ONLY", "NOISE"] as const).map((category) => {
        const messages = grouped[category];
        if (messages.length === 0) return null;

        return (
          <SectionCard
            key={category}
            title={`${categoryConfig[category].label} (${messages.length})`}
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <DigestMessageCard key={message.id} message={message} />
              ))}
            </div>
          </SectionCard>
        );
      })}

      {payload.messages.length === 0 && (
        <SectionCard title="Digest">
          <p className="text-sm text-muted2">No messages in this digest.</p>
        </SectionCard>
      )}
    </div>
  );
}

function DigestMessageCard({ message }: { message: DigestMessage }) {
  const categoryTone = categoryConfig[message.category];

  return (
    <div className="rounded-[18px] border border-border bg-bg px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-text">{message.author}</p>
          <p className="mt-1 text-xs text-muted2">
            {message.source}
            {message.channel ? ` · #${message.channel}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${categoryTone.badgeClassName}`}
        >
          {categoryTone.label}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
        {truncateText(message.content, 240)}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs italic text-muted2">{message.reason}</p>
        {message.permalink && (
          <a
            href={message.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand hover:underline"
          >
            View in Slack &rarr;
          </a>
        )}
      </div>
    </div>
  );
}

function DeliverySection({ job }: { job: JobResponse }) {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const items = job.deliveryLogs ?? [];

  if (items.length === 0) return null;

  async function handleRetry(logId: string) {
    setRetryingId(logId);
    try {
      await fetch(`/api/user/delivery/${encodeURIComponent(logId)}/retry`, {
        method: "POST",
      });
      window.location.reload();
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
          Destinations
        </h3>
        <span className="text-xs text-muted2">
          {items.length} delivery path{items.length === 1 ? "" : "s"}
        </span>
      </div>
      {items.map((item) => {
        const state = getDeliveryStatus(item.status);
        const stateLabel =
          state === "delivered"
            ? "Success"
            : state === "failed"
              ? "Failed"
              : "Pending";
        const detailText = item.errorMessage
          ? truncateText(item.errorMessage, 160)
          : item.deliveredAt
            ? `Delivered ${formatLongDateTime(item.deliveredAt)}`
            : "Queued for delivery.";

        return (
          <div
            key={item.id}
            className="rounded-[18px] border border-border bg-surface px-4 py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <DestinationBadge
                  delivery={{ provider: item.connectorId, status: item.status }}
                  compact
                />
                <div>
                  <p className="text-[15px] font-semibold text-text">
                    {getProviderLabel(item.connectorId)}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      state === "failed" ? "text-red" : "text-muted"
                    }`}
                  >
                    {detailText}
                  </p>
                  {item.retryCount > 0 && (
                    <p className="mt-1 text-xs text-muted2">
                      {item.retryCount} previous retr
                      {item.retryCount === 1 ? "y" : "ies"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${deliveryStateClassNames[state]}`}
                >
                  {stateLabel}
                </span>
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border bg-bg px-3 py-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand-lt"
                  >
                    Open
                  </a>
                )}
                {state === "failed" && (
                  <button
                    type="button"
                    onClick={() => handleRetry(item.id)}
                    disabled={retryingId === item.id}
                    className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {retryingId === item.id ? "Retrying..." : "Retry"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

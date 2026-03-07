"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { cleanMeetingTitle } from "@/lib/utils/clean-meeting-title";

interface MeetingSummary {
  title: string;
  date?: string;
  attendees: string[];
  summary: string;
  actionItems: Array<{ owner: string; task: string; deadline?: string }>;
  decisions: string[];
  followUps: string[];
}

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
  resultPayload: MeetingSummary | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  deliveryLogs?: DeliveryLogEntry[];
}

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
  const [fetchedId, setFetchedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (!job) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/user/drive/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: job.sourceFileId, fileName: job.sourceFileName }),
      });
      if (res.ok) {
        onClose();
        window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }

  if (!jobId && fetchedId) {
    setFetchedId(null);
    setJob(null);
    setError(null);
  }

  if (jobId && jobId !== fetchedId && !loading) {
    setFetchedId(jobId);
    setLoading(true);
    setError(null);

    fetch(`/api/user/jobs/${encodeURIComponent(jobId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to load note");
        }
        return res.json();
      })
      .then((data) => setJob(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load note")
      )
      .finally(() => setLoading(false));
  }

  const payload = job?.resultPayload as MeetingSummary | null;

  return (
    <Modal
      open={!!jobId}
      onClose={onClose}
      title={payload?.title ?? cleanMeetingTitle(job?.sourceFileName)}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red">{error}</div>
      ) : payload ? (
        <div className="space-y-4">
          <SummaryView payload={payload} />
          {job && <DeliverySection job={job} />}
        </div>
      ) : job?.status === "FAILED" ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red/10">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text">Processing failed</p>
          {job.errorMessage && (
            <p className="mt-1 text-xs text-muted2">{job.errorMessage}</p>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {retrying ? "Retrying..." : "Retry Processing"}
          </button>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-muted2">
          No summary available
        </div>
      )}
    </Modal>
  );
}

function SummaryView({ payload }: { payload: MeetingSummary }) {
  return (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-0.5">
        {payload.date && (
          <p className="text-xs text-muted2">{payload.date}</p>
        )}
        {payload.attendees.length > 0 && (
          <p className="text-xs text-muted2">
            Attendees: {payload.attendees.join(", ")}
          </p>
        )}
      </div>

      <div>
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted2">
          Summary
        </h4>
        <p className="whitespace-pre-wrap leading-relaxed text-text">
          {payload.summary}
        </p>
      </div>

      {payload.actionItems.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted2">
            Action Items
          </h4>
          <ul className="space-y-1.5">
            {payload.actionItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-text"
              >
                <svg
                  className="mt-0.5 shrink-0 text-brand"
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>{item.owner}:</strong> {item.task}
                  {item.deadline && (
                    <span className="ml-1 text-xs text-muted2">
                      (by {item.deadline})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {payload.decisions.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted2">
            Decisions
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-text">
            {payload.decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {payload.followUps.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted2">
            Follow-ups
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-text">
            {payload.followUps.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const providerLabels: Record<string, string> = {
  NEXUS_HISTORY: "Nexus History",
  SLACK: "Slack",
  CLICKUP: "ClickUp",
};

function DeliverySection({ job }: { job: JobResponse }) {
  const [open, setOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const items: Array<{
    id: string;
    connector: string;
    label: string;
    status: "delivered" | "failed" | "pending";
    time: string | null;
    error: string | null;
    externalUrl: string | null;
  }> = [];

  if (job.deliveryLogs && job.deliveryLogs.length > 0) {
    for (const dl of job.deliveryLogs) {
      items.push({
        id: dl.id,
        connector: dl.connectorId,
        label: providerLabels[dl.connectorId] ?? dl.connectorId,
        status: dl.status === "DELIVERED" ? "delivered" : dl.status === "FAILED" ? "failed" : "pending",
        time: dl.deliveredAt,
        error: dl.errorMessage,
        externalUrl: dl.externalUrl ?? null,
      });
    }
  }

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
    <div className="border-t border-border pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-left text-xs font-bold uppercase tracking-wider text-muted2 hover:text-text transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Delivered to ({items.length})
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    item.status === "delivered"
                      ? "bg-green"
                      : item.status === "failed"
                        ? "bg-red"
                        : "bg-amber"
                  }`}
                />
                {item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-brand hover:underline"
                  >
                    {item.label}
                    <svg className="ml-1 inline-block" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-[13px] text-text">{item.label}</span>
                )}
                {item.time && (
                  <span className="text-[10px] text-muted2">
                    {new Date(item.time).toLocaleString()}
                  </span>
                )}
              </div>
              {item.status === "failed" && (
                <button
                  onClick={() => handleRetry(item.id)}
                  disabled={retryingId === item.id}
                  className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  {retryingId === item.id ? "Retrying..." : "Retry"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

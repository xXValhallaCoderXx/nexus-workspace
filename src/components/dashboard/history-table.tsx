"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { NoteDetailModal } from "@/components/dashboard/note-detail-modal";
import { useNoteModal } from "@/hooks/use-note-modal";
import { cleanMeetingTitle } from "@/lib/utils/clean-meeting-title";

interface Job {
  id: string;
  sourceFileId: string;
  sourceFileName: string | null;
  status: string;
  destinationDelivered: string | null;
  createdAt: string;
  completedAt: string | null;
  resultPayload: Record<string, unknown> | null;
  errorMessage: string | null;
}

const statusMap: Record<string, { variant: "ready" | "processing" | "failed" | "pending"; label: string }> = {
  COMPLETED: { variant: "ready", label: "Ready" },
  PROCESSING: { variant: "processing", label: "Processing" },
  FAILED: { variant: "failed", label: "Failed" },
  PENDING: { variant: "pending", label: "Pending" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function HistoryTableInner({
  jobs,
  currentPage,
  totalPages,
}: {
  jobs: Job[];
  currentPage: number;
  totalPages: number;
}) {
  const { activeNoteId, openNote, closeNote } = useNoteModal();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function handleRetry(job: Job) {
    setRetryingId(job.id);
    try {
      const res = await fetch("/api/user/drive/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: job.sourceFileId, fileName: job.sourceFileName }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setRetryingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <Card className="px-5 py-12 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-lt">
          <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text">No meetings found</p>
        <p className="mt-1 text-xs text-muted2">
          Processed transcripts will appear here and be delivered to your connected destinations. Head to Notes to process your first transcript.
        </p>
        <Link
          href="/dashboard/notes"
          className="mt-3 inline-block text-xs font-semibold text-brand hover:underline"
        >
          Browse transcripts &rarr;
        </Link>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border bg-surface2 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted2">
                Meeting
              </th>
              <th className="border-b border-border bg-surface2 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted2">
                Date
              </th>
              <th className="border-b border-border bg-surface2 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted2">
                Delivered to
              </th>
              <th className="border-b border-border bg-surface2 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted2">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const st = statusMap[job.status] ?? { variant: "pending" as const, label: job.status };
              const isReady = job.status === "COMPLETED";

              return (
                <tr
                  key={job.id}
                  onClick={() => isReady && openNote(job.id)}
                  className={isReady ? "cursor-pointer hover:bg-bg" : ""}
                >
                  <td className="border-b border-border px-4 py-3 text-[13px]">
                    <div className="font-semibold text-text">
                      {cleanMeetingTitle(job.sourceFileName)}
                    </div>
                    {job.status === "FAILED" && job.errorMessage && (
                      <div className="mt-0.5 text-[11px] text-red">
                        {job.errorMessage.length > 80
                          ? job.errorMessage.slice(0, 80) + "..."
                          : job.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-[13px] text-muted2">
                    {formatDate(job.createdAt)}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-[13px] text-muted2">
                    <DestinationPills destinations={job.destinationDelivered} />
                  </td>
                  <td className="border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                      {job.status === "FAILED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(job);
                          }}
                          disabled={retryingId !== null}
                          className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {retryingId === job.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`/dashboard/history?page=${Math.max(1, currentPage - 1)}`}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              currentPage <= 1
                ? "pointer-events-none text-muted2"
                : "text-brand hover:bg-brand-lt"
            }`}
          >
            Previous
          </Link>
          <span className="text-xs text-muted2">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={`/dashboard/history?page=${Math.min(totalPages, currentPage + 1)}`}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              currentPage >= totalPages
                ? "pointer-events-none text-muted2"
                : "text-brand hover:bg-brand-lt"
            }`}
          >
            Next
          </Link>
        </div>
      )}

      <NoteDetailModal jobId={activeNoteId} onClose={closeNote} />
    </>
  );
}

export function HistoryTable(props: {
  jobs: Job[];
  currentPage: number;
  totalPages: number;
}) {
  return (
    <Suspense>
      <HistoryTableInner {...props} />
    </Suspense>
  );
}

const destinationLabels: Record<string, string> = {
  DATABASE: "Nexus",
  SLACK: "Slack",
  ATTIO: "Attio",
  CLICKUP: "ClickUp",
  nexus_history: "Nexus",
  slack: "Slack",
  attio: "Attio",
  clickup: "ClickUp",
};

function DestinationPills({ destinations }: { destinations: string | null }) {
  if (!destinations) return <span>—</span>;
  const parts = destinations.split(",").map((d) => d.trim()).filter(Boolean);
  if (parts.length === 0) return <span>—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((dest) => (
        <span
          key={dest}
          className="inline-flex items-center rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] font-medium text-muted2"
        >
          {destinationLabels[dest] ?? dest}
        </span>
      ))}
    </div>
  );
}

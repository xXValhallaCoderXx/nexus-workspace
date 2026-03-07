"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { NoteDetailModal } from "@/components/dashboard/note-detail-modal";
import {
  DestinationBadge,
  WorkflowRunIcon,
} from "@/components/dashboard/workflow-run-primitives";
import { useNoteModal } from "@/hooks/use-note-modal";
import { cleanMeetingTitle } from "@/lib/utils/clean-meeting-title";
import {
  formatRelativeDay,
  formatTime,
  getWorkflowInsightBadges,
  getWorkflowKindLabel,
  getWorkflowPreview,
  truncateText,
  type DeliveryPreview,
} from "@/lib/utils/workflow-run-display";

interface Job {
  id: string;
  workflowType: string;
  sourceFileId: string;
  sourceFileName: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  resultPayload: Record<string, unknown> | null;
  errorMessage: string | null;
  deliveries: DeliveryPreview[];
}

const statusMap: Record<string, { variant: "ready" | "processing" | "failed" | "pending"; label: string }> = {
  COMPLETED: { variant: "ready", label: "Ready" },
  PROCESSING: { variant: "processing", label: "Processing" },
  FAILED: { variant: "failed", label: "Failed" },
  PENDING: { variant: "pending", label: "Pending" },
};

function jobDisplayTitle(job: Job): string {
  if (job.workflowType === "SCHEDULED_DIGEST") {
    return job.sourceFileName ?? "Triage Digest";
  }
  return cleanMeetingTitle(job.sourceFileName);
}

function buildPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set(
    [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
      (page) => page >= 1 && page <= totalPages
    )
  );

  const sortedPages = [...pages].sort((left, right) => left - right);
  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function fallbackPreview(job: Job) {
  if (job.status === "FAILED") {
    return job.errorMessage ?? "Processing failed before a summary could be generated.";
  }

  if (job.status === "PROCESSING") {
    return "Nexus is extracting the summary and preparing destinations.";
  }

  if (job.status === "PENDING") {
    return "Queued and waiting for transcript processing.";
  }

  return "Summary ready to review.";
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
  const searchParams = useSearchParams();
  const { activeNoteId, openNote, closeNote } = useNoteModal();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const paginationItems = buildPagination(currentPage, totalPages);

  function buildPageHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }

    return params.toString()
      ? `/dashboard/history?${params.toString()}`
      : "/dashboard/history";
  }

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
          <svg
            width="17"
            height="17"
            fill="none"
            viewBox="0 0 24 24"
            stroke="var(--brand)"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-text">No meetings found</p>
        <p className="mt-1 text-xs text-muted2">
          Processed transcripts and digests will appear here and be delivered to
          your connected destinations. Head to Notes to process your first
          transcript.
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
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-border bg-surface2 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2">
                  Meeting
                </th>
                <th className="border-b border-border bg-surface2 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2">
                  Date &amp; time
                </th>
                <th className="border-b border-border bg-surface2 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2">
                  Highlights
                </th>
                <th className="border-b border-border bg-surface2 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2">
                  Destinations
                </th>
                <th className="border-b border-border bg-surface2 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2">
                  Status
                </th>
                <th className="border-b border-border bg-surface2 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const statusInfo = statusMap[job.status] ?? {
                  variant: "pending" as const,
                  label: job.status,
                };
                const isReady = job.status === "COMPLETED";
                const preview =
                  getWorkflowPreview(job.workflowType, job.resultPayload) ??
                  fallbackPreview(job);
                const insights = getWorkflowInsightBadges(
                  job.workflowType,
                  job.resultPayload
                );
                const visibleDeliveries = job.deliveries.slice(0, 3);

                return (
                  <tr
                    key={job.id}
                    onClick={() => isReady && openNote(job.id)}
                    className={`border-b border-border align-top transition-colors ${
                      isReady ? "cursor-pointer hover:bg-bg/70" : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[320px] gap-3">
                        <WorkflowRunIcon
                          workflowType={job.workflowType}
                          status={job.status}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-[15px] font-semibold text-text">
                              {jobDisplayTitle(job)}
                            </div>
                            <span className="rounded-full bg-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted2">
                              {getWorkflowKindLabel(job.workflowType)}
                            </span>
                          </div>
                          <p
                            className={`mt-1 overflow-hidden text-[12px] leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                              job.status === "FAILED" ? "text-red" : "text-muted"
                            }`}
                          >
                            {truncateText(preview, 120)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-[120px]">
                        <div className="text-[13px] font-semibold text-text">
                          {formatRelativeDay(job.createdAt)}
                        </div>
                        <div className="mt-1 text-[12px] text-muted2">
                          {formatTime(job.createdAt)}
                        </div>
                        {job.completedAt && job.status === "COMPLETED" && (
                          <div className="mt-2 text-[11px] text-muted">
                            Ready at {formatTime(job.completedAt)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[220px] flex-wrap gap-1.5">
                        {(insights.length > 0 ? insights : ["Summary pending"]).map(
                          (insight) => (
                            <span
                              key={`${job.id}-${insight}`}
                              className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
                            >
                              {insight}
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[140px] flex-wrap items-center gap-2">
                        {visibleDeliveries.length > 0 ? (
                          <>
                            {visibleDeliveries.map((delivery) => (
                              <DestinationBadge
                                key={`${job.id}-${delivery.provider}`}
                                delivery={delivery}
                                compact
                              />
                            ))}
                            {job.deliveries.length > visibleDeliveries.length && (
                              <span className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted">
                                +{job.deliveries.length - visibleDeliveries.length}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[12px] text-muted2">
                            Waiting for delivery
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <StatusBadge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </StatusBadge>
                        {job.status === "FAILED" && job.errorMessage && (
                          <div className="max-w-[180px] text-[11px] text-red">
                            {truncateText(job.errorMessage, 70)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {job.status === "FAILED" &&
                      job.workflowType === "MEETING_SUMMARY" ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRetry(job);
                          }}
                          disabled={retryingId !== null}
                          className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {retryingId === job.id ? "Retrying..." : "Retry"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isReady) openNote(job.id);
                          }}
                          disabled={!isReady}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 ${
                            isReady
                              ? "text-muted transition-colors hover:text-text"
                              : "cursor-default text-muted2 opacity-40"
                          }`}
                          aria-label={isReady ? "Open summary" : "Summary not ready"}
                        >
                          <svg
                            width="15"
                            height="15"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.25"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m9 6 6 6-6 6"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={buildPageHref(Math.max(1, currentPage - 1))}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              currentPage <= 1
                ? "pointer-events-none text-muted2"
                : "text-brand hover:bg-brand-lt"
            }`}
          >
            Previous
          </Link>
          <div className="flex items-center justify-center gap-1.5">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-xs font-medium text-muted2"
                >
                  ...
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildPageHref(item)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    item === currentPage
                      ? "bg-brand text-white shadow-[0_6px_18px_rgba(91,76,245,0.22)]"
                      : "text-muted hover:bg-brand-lt hover:text-brand"
                  }`}
                >
                  {item}
                </Link>
              )
            )}
          </div>
          <Link
            href={buildPageHref(Math.min(totalPages, currentPage + 1))}
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

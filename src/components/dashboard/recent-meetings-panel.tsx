"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { NoteDetailModal } from "@/components/dashboard/note-detail-modal";
import {
  DestinationBadge,
  WorkflowRunIcon,
} from "@/components/dashboard/workflow-run-primitives";
import { useNoteModal } from "@/hooks/use-note-modal";
import { cleanMeetingTitle } from "@/lib/utils/clean-meeting-title";
import {
  formatRelativeDateTime,
  getWorkflowInsightBadges,
  getWorkflowKindLabel,
  getWorkflowPreview,
  type DeliveryPreview,
} from "@/lib/utils/workflow-run-display";

interface Meeting {
  id: string;
  workflowType: string;
  sourceFileName: string | null;
  status: string;
  createdAt: string;
  resultPayload: Record<string, unknown> | null;
  deliveries: DeliveryPreview[];
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

function EmptyPanelState() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-lt">
        <WorkflowRunIcon workflowType="MEETING_SUMMARY" status="COMPLETED" />
      </div>
      <p className="text-sm font-medium text-text">No meetings yet</p>
      <p className="mt-1 text-xs text-muted2">
        Your meeting summaries will appear here and be sent to your connected
        destinations once a transcript is processed.
      </p>
      <Link
        href="/dashboard/notes"
        className="mt-4 inline-block text-xs font-semibold text-brand hover:underline"
      >
        Browse transcripts &rarr;
      </Link>
    </div>
  );
}

function itemTitle(meeting: Meeting) {
  if (meeting.workflowType === "SCHEDULED_DIGEST") {
    return meeting.sourceFileName ?? "Triage Digest";
  }

  return cleanMeetingTitle(meeting.sourceFileName);
}

function fallbackMessage(meeting: Meeting) {
  if (meeting.status === "PROCESSING") {
    return "Nexus is turning this transcript into a structured summary.";
  }

  if (meeting.status === "FAILED") {
    return "This run needs attention before a summary can be viewed.";
  }

  if (meeting.status === "PENDING") {
    return "Queued and waiting for transcript processing.";
  }

  return "Summary ready to review.";
}

function RecentMeetingsPanelInner({ meetings }: { meetings: Meeting[] }) {
  const { activeNoteId, openNote, closeNote } = useNoteModal();

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span>Recent meetings</span>
            <span className="rounded-full border border-border bg-bg px-2 py-1 text-[11px] font-semibold text-muted">
              {meetings.length}
            </span>
          </div>
        }
        subtitle="Summaries and digests flowing through your workspace."
        action={
          <Link
            href="/dashboard/history"
            className="text-xs font-semibold text-brand hover:underline"
          >
            View all meetings &rarr;
          </Link>
        }
      />
      {meetings.length === 0 ? (
        <EmptyPanelState />
      ) : (
        <div className="divide-y divide-border">
          {meetings.map((meeting) => {
            const statusInfo =
              statusMap[meeting.status] ?? statusMap.PENDING;
            const isReady = meeting.status === "COMPLETED";
            const preview =
              getWorkflowPreview(meeting.workflowType, meeting.resultPayload) ??
              fallbackMessage(meeting);
            const insightBadges = getWorkflowInsightBadges(
              meeting.workflowType,
              meeting.resultPayload
            );
            const visibleDeliveries = meeting.deliveries.slice(0, 3);

            return (
              <button
                key={meeting.id}
                type="button"
                onClick={() => isReady && openNote(meeting.id)}
                disabled={!isReady}
                className={`group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors ${
                  isReady ? "hover:bg-bg/70" : "disabled:cursor-default"
                }`}
              >
                <WorkflowRunIcon
                  workflowType={meeting.workflowType}
                  status={meeting.status}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-text">
                      {itemTitle(meeting)}
                    </p>
                    <span className="rounded-full bg-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted2">
                      {getWorkflowKindLabel(meeting.workflowType)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted2">
                    {formatRelativeDateTime(meeting.createdAt)}
                  </p>
                  <p className="mt-2 overflow-hidden text-[13px] leading-6 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {preview}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {insightBadges.slice(0, 3).map((insight) => (
                      <span
                        key={insight}
                        className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
                      >
                        {insight}
                      </span>
                    ))}
                    {visibleDeliveries.length > 0 && (
                      <div className="flex items-center gap-2">
                        {visibleDeliveries.map((delivery) => (
                          <DestinationBadge
                            key={`${meeting.id}-${delivery.provider}`}
                            delivery={delivery}
                            compact
                          />
                        ))}
                        {meeting.deliveries.length > visibleDeliveries.length && (
                          <span className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted">
                            +{meeting.deliveries.length - visibleDeliveries.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <StatusBadge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </StatusBadge>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 text-muted transition-colors ${
                      isReady ? "group-hover:text-text" : "opacity-40"
                    }`}
                  >
                    <svg
                      width="15"
                      height="15"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m9 6 6 6-6 6"
                      />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <NoteDetailModal jobId={activeNoteId} onClose={closeNote} />
    </Card>
  );
}

export function RecentMeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <Suspense>
      <RecentMeetingsPanelInner meetings={meetings} />
    </Suspense>
  );
}

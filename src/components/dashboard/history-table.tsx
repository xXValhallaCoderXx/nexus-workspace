"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { NoteDetailModal } from "@/components/dashboard/note-detail-modal";
import { useNoteModal } from "@/hooks/use-note-modal";

interface Job {
  id: string;
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

  if (jobs.length === 0) {
    return (
      <Card className="px-5 py-12 text-center">
        <p className="text-sm text-muted2">
          No meetings found. Processed transcripts will appear here.
        </p>
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
                Destination
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
                      {job.sourceFileName ?? "Untitled"}
                    </div>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-[13px] text-muted2">
                    {formatDate(job.createdAt)}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-[13px] text-muted2">
                    {job.destinationDelivered ?? "—"}
                  </td>
                  <td className="border-b border-border px-4 py-3">
                    <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
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

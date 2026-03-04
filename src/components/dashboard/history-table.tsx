"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

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

export function HistoryTable({
  jobs,
  currentPage,
  totalPages,
}: {
  jobs: Job[];
  currentPage: number;
  totalPages: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              const hasPayload = job.status === "COMPLETED" && job.resultPayload;
              const isExpanded = expandedId === job.id;

              return (
                <>
                  <tr
                    key={job.id}
                    onClick={() => hasPayload && setExpandedId(isExpanded ? null : job.id)}
                    className={hasPayload ? "cursor-pointer hover:bg-bg" : ""}
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
                  {isExpanded && job.resultPayload && (
                    <tr key={`${job.id}-expand`}>
                      <td colSpan={4} className="border-b border-border bg-bg px-4 py-4">
                        <SummaryView payload={job.resultPayload as unknown as MeetingSummary} />
                      </td>
                    </tr>
                  )}
                </>
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
    </>
  );
}

interface MeetingSummary {
  title: string;
  date?: string;
  attendees: string[];
  summary: string;
  actionItems: Array<{ owner: string; task: string; deadline?: string }>;
  decisions: string[];
  followUps: string[];
}

function SummaryView({ payload }: { payload: MeetingSummary }) {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <h4 className="font-semibold text-text">{payload.title}</h4>
        {payload.date && <p className="text-muted2">{payload.date}</p>}
        {payload.attendees.length > 0 && (
          <p className="text-muted2">Attendees: {payload.attendees.join(", ")}</p>
        )}
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-muted">
        {payload.summary}
      </p>
      {payload.actionItems.length > 0 && (
        <div>
          <h5 className="font-semibold text-text">Action Items</h5>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {payload.actionItems.map((item, i) => (
              <li key={i}>
                <strong className="text-text">{item.owner}:</strong> {item.task}
                {item.deadline && ` (by ${item.deadline})`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {payload.decisions.length > 0 && (
        <div>
          <h5 className="font-semibold text-text">Decisions</h5>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {payload.decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { NoteDetailModal } from "@/components/dashboard/note-detail-modal";
import { useNoteModal } from "@/hooks/use-note-modal";

interface Meeting {
  id: string;
  sourceFileName: string | null;
  status: string;
  createdAt: string;
  resultPayload: Record<string, unknown> | null;
}

function MicIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function RecentMeetingsPanelInner({ meetings }: { meetings: Meeting[] }) {
  const { activeNoteId, openNote, closeNote } = useNoteModal();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    if (days === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Card>
      <CardHeader
        title="Recent Meetings"
        subtitle="Click any ready meeting to view its summary"
        action={
          <Link href="/dashboard/history" className="text-xs font-semibold text-brand hover:underline">
            View all &rarr;
          </Link>
        }
      />
      <div className="py-1.5">
        {meetings.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-muted2">
            No meetings processed yet
          </p>
        )}
        {meetings.map((m) => {
          const isProcessing = m.status === "PROCESSING";
          const isReady = m.status === "COMPLETED";

          return (
            <div
              key={m.id}
              onClick={() => isReady && openNote(m.id)}
              className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                isReady ? "cursor-pointer hover:bg-bg" : ""
              }`}
            >
              <div
                className={`mt-[1px] flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] ${
                  isProcessing ? "bg-amber-lt" : "bg-brand-lt"
                }`}
              >
                <MicIcon color={isProcessing ? "var(--amber)" : "var(--brand)"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-text">
                    {m.sourceFileName ?? "Untitled Meeting"}
                  </span>
                  <StatusBadge
                    variant={
                      m.status === "COMPLETED"
                        ? "ready"
                        : m.status === "PROCESSING"
                          ? "processing"
                          : m.status === "FAILED"
                            ? "failed"
                            : "pending"
                    }
                  >
                    {m.status === "COMPLETED"
                      ? "Ready"
                      : m.status === "PROCESSING"
                        ? "Processing"
                        : m.status === "FAILED"
                          ? "Failed"
                          : "Pending"}
                  </StatusBadge>
                </div>
                <div className="mt-[3px] text-[11px] text-muted2">
                  {formatDate(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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

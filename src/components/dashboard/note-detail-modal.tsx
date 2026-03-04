"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

interface MeetingSummary {
  title: string;
  date?: string;
  attendees: string[];
  summary: string;
  actionItems: Array<{ owner: string; task: string; deadline?: string }>;
  decisions: string[];
  followUps: string[];
}

interface JobResponse {
  id: string;
  sourceFileName: string | null;
  status: string;
  resultPayload: MeetingSummary | null;
  createdAt: string;
  completedAt: string | null;
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

  // Reset state when jobId changes to null (modal closed)
  if (!jobId && fetchedId) {
    setFetchedId(null);
    setJob(null);
    setError(null);
  }

  // Fetch when a new jobId is provided
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
      title={payload?.title ?? job?.sourceFileName ?? "Meeting Note"}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red">{error}</div>
      ) : payload ? (
        <SummaryView payload={payload} />
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
      {/* Meta */}
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

      {/* Summary */}
      <div>
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted2">
          Summary
        </h4>
        <p className="whitespace-pre-wrap leading-relaxed text-text">
          {payload.summary}
        </p>
      </div>

      {/* Action Items */}
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

      {/* Decisions */}
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

      {/* Follow-ups */}
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

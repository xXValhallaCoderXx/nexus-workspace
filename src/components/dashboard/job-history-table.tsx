"use client";

import { useState } from "react";
import Link from "next/link";

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

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function JobHistoryTable({
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
      <p className="mt-6 text-sm text-gray-500">
        No jobs yet. Once you connect Google Drive and enable meeting summaries,
        processed transcripts will appear here.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                File
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Destination
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {jobs.map((job) => (
              <>
                <tr key={job.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {job.sourceFileName ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {job.destinationDelivered ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {job.status === "COMPLETED" && job.resultPayload && (
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === job.id ? null : job.id
                          )
                        }
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {expandedId === job.id ? "Hide" : "View Summary"}
                      </button>
                    )}
                    {job.status === "FAILED" && job.errorMessage && (
                      <span className="text-xs text-red-600" title={job.errorMessage}>
                        Error
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === job.id && job.resultPayload && (
                  <tr key={`${job.id}-detail`}>
                    <td colSpan={5} className="bg-gray-50 px-4 py-4">
                      <SummaryView
                        payload={
                          job.resultPayload as unknown as MeetingSummary
                        }
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`/dashboard/history?page=${Math.max(1, currentPage - 1)}`}
            className={`rounded-md px-4 py-2 text-sm ${currentPage <= 1 ? "pointer-events-none text-gray-400" : "text-blue-600 hover:bg-blue-50"}`}
          >
            Previous
          </Link>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={`/dashboard/history?page=${Math.min(totalPages, currentPage + 1)}`}
            className={`rounded-md px-4 py-2 text-sm ${currentPage >= totalPages ? "pointer-events-none text-gray-400" : "text-blue-600 hover:bg-blue-50"}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
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
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-semibold text-gray-900">{payload.title}</h4>
        {payload.date && (
          <p className="text-xs text-gray-500">{payload.date}</p>
        )}
        {payload.attendees.length > 0 && (
          <p className="text-xs text-gray-500">
            Attendees: {payload.attendees.join(", ")}
          </p>
        )}
      </div>
      <p className="whitespace-pre-wrap text-gray-700">{payload.summary}</p>
      {payload.actionItems.length > 0 && (
        <div>
          <h5 className="font-medium text-gray-900">Action Items</h5>
          <ul className="mt-1 list-disc pl-5 text-gray-700">
            {payload.actionItems.map((item, i) => (
              <li key={i}>
                <strong>{item.owner}:</strong> {item.task}
                {item.deadline && ` (by ${item.deadline})`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {payload.decisions.length > 0 && (
        <div>
          <h5 className="font-medium text-gray-900">Decisions</h5>
          <ul className="mt-1 list-disc pl-5 text-gray-700">
            {payload.decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {payload.followUps.length > 0 && (
        <div>
          <h5 className="font-medium text-gray-900">Follow-ups</h5>
          <ul className="mt-1 list-disc pl-5 text-gray-700">
            {payload.followUps.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

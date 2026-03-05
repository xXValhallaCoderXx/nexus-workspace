"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { SearchInput } from "@/components/ui/search-input";
import { NoteDetailModal } from "@/components/dashboard/note-detail-modal";
import { useNoteModal } from "@/hooks/use-note-modal";
import { cleanMeetingTitle } from "@/lib/utils/clean-meeting-title";

interface DriveFile {
  fileId: string;
  fileName: string;
  modifiedTime: string;
  jobStatus: string | null;
  jobId: string | null;
}

const statusFilters = [
  { label: "All", value: "" },
  { label: "Ready", value: "COMPLETED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Not Processed", value: "NONE" },
  { label: "Failed", value: "FAILED" },
];

function MicIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 005.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 013.51 15" />
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (days === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function DriveFilesPanelInner() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringFileId, setTriggeringFileId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const { activeNoteId, openNote, closeNote } = useNoteModal();

  async function fetchFiles() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/drive/files");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load files");
      }
      const data = await res.json();
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (statusFilter === "COMPLETED") {
      result = result.filter((f) => f.jobStatus === "COMPLETED");
    } else if (statusFilter === "PROCESSING") {
      result = result.filter(
        (f) => f.jobStatus === "PROCESSING" || f.jobStatus === "PENDING"
      );
    } else if (statusFilter === "FAILED") {
      result = result.filter((f) => f.jobStatus === "FAILED");
    } else if (statusFilter === "NONE") {
      result = result.filter((f) => f.jobStatus === null);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.fileName.toLowerCase().includes(q));
    }

    return result;
  }, [files, statusFilter, search]);

  async function triggerProcess(fileId: string, fileName: string) {
    setTriggeringFileId(fileId);
    try {
      const res = await fetch("/api/user/drive/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, fileName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to trigger processing");
      }
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger processing");
    } finally {
      setTriggeringFileId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Drive Transcripts"
        subtitle="Browse and process your Google Drive transcripts"
        action={
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand/80 disabled:opacity-50"
          >
            <RefreshIcon />
            Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            />
          ))}
        </div>
        <div className="ml-auto">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search files..."
          />
        </div>
      </div>

      {loading && files.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-muted2">
          Loading transcript files...
        </div>
      ) : error ? (
        <div className="px-5 py-10 text-center text-xs text-red">{error}</div>
      ) : filteredFiles.length === 0 ? (
        <div className="px-5 py-10 text-center">
          {files.length === 0 ? (
            <>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-lt">
                <MicIcon />
              </div>
              <p className="text-sm font-medium text-text">No transcripts found</p>
              <p className="mt-1 text-xs text-muted2">
                Google Meet transcripts will appear here after your meetings. Make sure &quot;Notes by Gemini&quot; is enabled in Google Meet.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted2">No files match your filters</p>
          )}
        </div>
      ) : (
        <div className="py-1.5">
          {filteredFiles.map((f) => {
            const isReady = f.jobStatus === "COMPLETED";

            return (
              <div
                key={f.fileId}
                onClick={() => isReady && f.jobId && openNote(f.jobId)}
                className={`flex items-center gap-3 px-5 py-3 ${
                  isReady ? "cursor-pointer hover:bg-bg" : ""
                }`}
              >
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-brand-lt">
                  <MicIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">
                    {cleanMeetingTitle(f.fileName)}
                  </div>
                  <div className="mt-[3px] text-[11px] text-muted2">
                    {formatDate(f.modifiedTime)}
                  </div>
                </div>
                <div className="shrink-0">
                  {f.jobStatus === "COMPLETED" ? (
                    <StatusBadge variant="ready">Ready</StatusBadge>
                  ) : f.jobStatus === "PROCESSING" || f.jobStatus === "PENDING" ? (
                    <StatusBadge variant="processing">Processing</StatusBadge>
                  ) : f.jobStatus === "FAILED" ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="failed">Failed</StatusBadge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerProcess(f.fileId, f.fileName);
                        }}
                        disabled={triggeringFileId !== null}
                        className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerProcess(f.fileId, f.fileName);
                      }}
                      disabled={triggeringFileId !== null}
                      className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {triggeringFileId === f.fileId ? "Queuing..." : "Process"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NoteDetailModal jobId={activeNoteId} onClose={closeNote} />
    </Card>
  );
}

export function DriveFilesPanel() {
  return (
    <Suspense>
      <DriveFilesPanelInner />
    </Suspense>
  );
}

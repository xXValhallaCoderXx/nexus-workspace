"use client";

import { useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

type ConnectorStatusMap = Record<
  string,
  {
    status: string;
    enabled: boolean;
    configJson: Record<string, unknown> | null;
  }
>;

export function WorkflowsContent({
  enabled,
  slackDmEnabled,
  quietModeEnabled,
  hasSlackConnected,
  connectorStatus,
}: {
  enabled: boolean;
  slackDmEnabled: boolean;
  quietModeEnabled: boolean;
  hasSlackConnected: boolean;
  connectorStatus: ConnectorStatusMap;
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isSlackDm, setIsSlackDm] = useState(slackDmEnabled);
  const [isQuietMode, setIsQuietMode] = useState(quietModeEnabled);
  const [loadingField, setLoadingField] = useState<string | null>(null);

  const clickup = connectorStatus["clickup"];
  const clickupReady =
    clickup?.status === "CONNECTED" &&
    clickup?.enabled &&
    !!clickup?.configJson;

  async function handleToggle(
    field: "meetingSummariesEnabled" | "slackDmEnabled" | "quietModeEnabled"
  ) {
    const setterMap: Record<typeof field, (v: boolean) => void> = {
      meetingSummariesEnabled: setIsEnabled,
      slackDmEnabled: setIsSlackDm,
      quietModeEnabled: setIsQuietMode,
    };
    const currentMap: Record<typeof field, boolean> = {
      meetingSummariesEnabled: isEnabled,
      slackDmEnabled: isSlackDm,
      quietModeEnabled: isQuietMode,
    };
    const newValue = !currentMap[field];

    setLoadingField(field);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (res.ok) {
        setterMap[field](newValue);
      }
    } finally {
      setLoadingField(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-bold text-text">Workflow Automation</h2>
        <p className="mt-1 text-[13px] text-muted">
          Configure how Nexus processes meetings, notifications, and task
          automation.
        </p>
      </div>

      {/* Meeting Auto-Processing */}
      <WorkflowSection
        icon={
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        }
        title="Meeting Auto-Processing"
        description="Automatically process new transcripts from Google Drive into structured meeting summaries with action items."
      >
        <div className="space-y-0">
          <ToggleRow
            label="Meeting Summaries"
            description="Process new transcripts automatically"
            enabled={isEnabled}
            onToggle={() => handleToggle("meetingSummariesEnabled")}
            loading={loadingField === "meetingSummariesEnabled"}
          />

          {hasSlackConnected && (
            <ToggleRow
              label="Slack DM on ready"
              description="Notify via Slack when a summary is complete"
              enabled={isSlackDm}
              onToggle={() => handleToggle("slackDmEnabled")}
              loading={loadingField === "slackDmEnabled"}
              hasBorderTop
            />
          )}

          {clickupReady && (
            <div className="flex items-center justify-between border-t border-border py-[11px]">
              <div>
                <div className="text-[13px] font-medium text-text">
                  ClickUp doc on ready
                </div>
                <div className="mt-[2px] text-[11px] text-muted2">
                  Create ClickUp doc when a summary is complete
                </div>
              </div>
              <span className="text-[11px] font-semibold text-green">
                Active
              </span>
            </div>
          )}
        </div>
      </WorkflowSection>

      {/* Quiet Mode / Triage */}
      {hasSlackConnected && (
        <WorkflowSection
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          }
          title="Quiet Mode (Triage Digest)"
          description="Batch @mentions from Slack into a classified digest delivered at scheduled intervals, reducing noise while surfacing important messages."
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-text">
                Enable Triage Digest
              </div>
              <div className="mt-[2px] text-[11px] text-muted2">
                Classify and batch incoming @mentions
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isQuietMode && <SyncNowButton />}
              <ToggleSwitch
                enabled={isQuietMode}
                onToggle={() => handleToggle("quietModeEnabled")}
                disabled={loadingField !== null}
              />
            </div>
          </div>
        </WorkflowSection>
      )}

      {/* Routing Rules (Placeholder) */}
      <WorkflowSection
        icon={
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        }
        title="Routing Rules"
        description="Conditional logic for high-priority items."
        muted
      >
        <p className="text-[13px] italic text-muted2">
          No active rules. Create rules to auto-flag urgent mentions or route
          specific keywords to different channels.
        </p>
      </WorkflowSection>
    </div>
  );
}

// ── Sub-components ──────────────────────────

function WorkflowSection({
  icon,
  title,
  description,
  children,
  muted,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`rounded-[14px] border border-border bg-surface p-5 shadow-card transition-all hover:border-border2 ${
        muted ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-bg text-muted">
          {icon}
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-text">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            {description}
          </p>
        </div>
      </div>
      <div className="pl-12">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
  loading,
  hasBorderTop,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  loading?: boolean;
  hasBorderTop?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-[11px] ${
        hasBorderTop ? "border-t border-border" : ""
      }`}
    >
      <div>
        <div className="text-[13px] font-medium text-text">{label}</div>
        <div className="mt-[2px] text-[11px] text-muted2">{description}</div>
      </div>
      <ToggleSwitch enabled={enabled} onToggle={onToggle} disabled={loading} />
    </div>
  );
}

function SyncNowButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/user/triage/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if (data.fetchedFromSlack > 0)
          parts.push(`Fetched ${data.fetchedFromSlack} from Slack`);
        if (data.messageCount > 0)
          parts.push(
            `Processed ${data.messageCount} message${data.messageCount === 1 ? "" : "s"}`
          );
        setResult({
          message:
            parts.length > 0
              ? parts.join(" · ")
              : (data.message ?? "No mentions found"),
          ok: data.messageCount > 0 || data.fetchedFromSlack > 0,
        });
      } else {
        setResult({ message: data.error ?? "Failed", ok: false });
      }
    } catch {
      setResult({ message: "Network error", ok: false });
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span
          className={`text-[11px] ${result.ok ? "text-green" : "text-red"}`}
        >
          {result.message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="rounded-md border border-border bg-surface px-3 py-1 text-[11px] font-medium text-text transition-colors hover:bg-surface2 disabled:opacity-50"
      >
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
}

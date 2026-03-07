"use client";

import { useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

type ConnectorStatusMap = Record<
  string,
  { status: string; enabled: boolean; configJson: Record<string, unknown> | null }
>;

export function SettingsWorkflows({
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
  const clickupReady = clickup?.status === "CONNECTED" && clickup?.enabled && !!clickup?.configJson;

  async function handleToggle(
    field: "meetingSummariesEnabled" | "slackDmEnabled" | "quietModeEnabled",
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
    <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">Workflows</div>
      <div className="mb-[18px] text-xs text-muted2">
        Automate your meeting processing
      </div>

      {/* Auto-summarise toggle */}
      <div className="flex items-center justify-between py-[11px]">
        <div>
          <div className="text-[13px] font-medium text-text">Meeting Summaries</div>
          <div className="mt-[2px] text-[11px] text-muted2">
            Process new transcripts automatically
          </div>
        </div>
        <ToggleSwitch
          enabled={isEnabled}
          onToggle={() => handleToggle("meetingSummariesEnabled")}
          disabled={loadingField !== null}
        />
      </div>

      {/* Slack DM toggle — only visible when Slack is connected */}
      {hasSlackConnected && (
        <div className="flex items-center justify-between border-t border-border py-[11px]">
          <div>
            <div className="text-[13px] font-medium text-text">Slack DM on ready</div>
            <div className="mt-[2px] text-[11px] text-muted2">
              Notify via Slack when a summary is complete
            </div>
          </div>
          <ToggleSwitch
            enabled={isSlackDm}
            onToggle={() => handleToggle("slackDmEnabled")}
            disabled={loadingField !== null}
          />
        </div>
      )}

      {/* Quiet Mode toggle — only visible when Slack is connected */}
      {hasSlackConnected && (
        <div className="flex items-center justify-between border-t border-border py-[11px]">
          <div>
            <div className="text-[13px] font-medium text-text">Quiet Mode (Triage Digest)</div>
            <div className="mt-[2px] text-[11px] text-muted2">
              Batch @mentions from Slack into a classified digest delivered at scheduled intervals instead of real-time pings
            </div>
          </div>
          <ToggleSwitch
            enabled={isQuietMode}
            onToggle={() => handleToggle("quietModeEnabled")}
            disabled={loadingField !== null}
          />
        </div>
      )}

      {/* ClickUp doc toggle — only visible when ClickUp is connected + configured + enabled */}
      {clickupReady && (
        <div className="flex items-center justify-between border-t border-border py-[11px]">
          <div>
            <div className="text-[13px] font-medium text-text">ClickUp doc on ready</div>
            <div className="mt-[2px] text-[11px] text-muted2">
              Create ClickUp doc when a summary is complete
            </div>
          </div>
          <StatusLabel active />
        </div>
      )}
    </div>
  );
}

function StatusLabel({ active }: { active: boolean }) {
  return (
    <span
      className={`text-[11px] font-semibold ${active ? "text-green" : "text-muted2"}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

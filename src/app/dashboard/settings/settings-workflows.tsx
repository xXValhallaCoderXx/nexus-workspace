"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  SettingsItem,
  SettingsMetaPill,
  SettingsNote,
  SettingsPanel,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./settings-ui";

export function SettingsWorkflows({
  enabled,
  quietModeEnabled,
  hasSlackConnected,
}: {
  enabled: boolean;
  quietModeEnabled: boolean;
  hasSlackConnected: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isQuietMode, setIsQuietMode] = useState(quietModeEnabled);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeAutomationCount = Number(isEnabled) + Number(isQuietMode);

  async function handleToggle(
    field: "meetingSummariesEnabled" | "quietModeEnabled"
  ) {
    const setterMap: Record<typeof field, (v: boolean) => void> = {
      meetingSummariesEnabled: setIsEnabled,
      quietModeEnabled: setIsQuietMode,
    };
    const currentMap: Record<typeof field, boolean> = {
      meetingSummariesEnabled: isEnabled,
      quietModeEnabled: isQuietMode,
    };
    const newValue = !currentMap[field];

    setLoadingField(field);
    setError(null);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (!res.ok) {
        setError(
          await readErrorMessage(res, "Failed to update workflow settings.")
        );
        return;
      }
      setterMap[field](newValue);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update workflow settings."
      );
    } finally {
      setLoadingField(null);
    }
  }

  function startOAuth(path: string) {
    window.location.assign(path);
  }

  return (
    <SettingsPanel
      icon={
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h7m5 0h4M4 12h4m6 0h6M4 18h10m4 0h2"
          />
        </svg>
      }
      eyebrow="Automation"
      title="Workflow controls"
      description="Choose how aggressively Nexus should process incoming meetings and whether Slack mentions should be grouped into scheduled digests."
      badge={
        <StatusBadge variant={activeAutomationCount > 0 ? "connected" : "pending"}>
          {activeAutomationCount > 0 ? `${activeAutomationCount} live` : "Paused"}
        </StatusBadge>
      }
      bodyClassName="space-y-3 p-6"
    >
      {error ? <SettingsNote tone="red">{error}</SettingsNote> : null}

      <SettingsItem
        tone={isEnabled ? "green" : "amber"}
        icon={
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        title="Meeting summaries"
        description="Automatically summarize new transcripts and keep your downstream delivery destinations warm."
        badge={
          <StatusBadge variant={isEnabled ? "connected" : "pending"}>
            {isEnabled ? "Enabled" : "Paused"}
          </StatusBadge>
        }
        action={
          <ToggleSwitch
            enabled={isEnabled}
            onToggle={() => handleToggle("meetingSummariesEnabled")}
            disabled={loadingField !== null}
          />
        }
        footer={
          <div className="flex flex-wrap gap-2">
            <SettingsMetaPill tone={isEnabled ? "green" : "amber"}>
              {isEnabled
                ? "Watching Google Drive for new transcripts"
                : "No new transcripts will be processed"}
            </SettingsMetaPill>
          </div>
        }
      />

      <SettingsItem
        tone={hasSlackConnected ? (isQuietMode ? "brand" : "neutral") : "amber"}
        icon={
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 8h16M8 4v16m8-8a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        }
        title="Quiet Mode digest"
        description={
          hasSlackConnected
            ? "Batch Slack @mentions into scheduled triage digests instead of handling them one by one."
            : "Connect Slack to batch @mentions into classified digests and unlock manual sync."
        }
        badge={
          <StatusBadge
            variant={
              hasSlackConnected
                ? isQuietMode
                  ? "active"
                  : "pending"
                : "expired"
            }
          >
            {hasSlackConnected
              ? isQuietMode
                ? "Batching"
                : "Available"
              : "Slack required"}
          </StatusBadge>
        }
        action={
          hasSlackConnected ? (
            <ToggleSwitch
              enabled={isQuietMode}
              onToggle={() => handleToggle("quietModeEnabled")}
              disabled={loadingField !== null}
            />
          ) : (
            <button
              onClick={() => startOAuth("/api/auth/slack")}
              className={primaryButtonClassName}
            >
              Connect Slack
            </button>
          )
        }
        footer={
          hasSlackConnected ? (
            isQuietMode ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <SettingsMetaPill tone="brand">
                    Digest batching active
                  </SettingsMetaPill>
                  <SettingsMetaPill tone="neutral">
                    Sync on demand available
                  </SettingsMetaPill>
                </div>
                <SyncNowButton />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <SettingsMetaPill tone="neutral">
                  Enable when you want scheduled triage digests
                </SettingsMetaPill>
              </div>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              <SettingsMetaPill tone="neutral">
                Slack is also used for delivery alerts
              </SettingsMetaPill>
            </div>
          )
        }
      />

      <SettingsNote tone="brand">
        Slack DM alerts and ClickUp document delivery are controlled in{" "}
        <span className="font-semibold text-text">Destinations</span> below, so
        automation rules stay separate from where summaries land.
      </SettingsNote>
    </SettingsPanel>
  );
}

function SyncNowButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(
    null
  );

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/user/triage/trigger", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        fetchedFromSlack?: number;
        messageCount?: number;
      };

      if (res.ok) {
        const parts: string[] = [];
        if ((data.fetchedFromSlack ?? 0) > 0) {
          parts.push(`Fetched ${data.fetchedFromSlack} from Slack`);
        }
        if ((data.messageCount ?? 0) > 0) {
          parts.push(
            `Processed ${data.messageCount} message${
              data.messageCount === 1 ? "" : "s"
            }`
          );
        }
        setResult({
          message:
            parts.length > 0 ? parts.join(" · ") : data.message ?? "No mentions found",
          ok: (data.messageCount ?? 0) > 0 || (data.fetchedFromSlack ?? 0) > 0,
        });
      } else {
        setResult({ message: data.error ?? "Failed", ok: false });
      }
    } catch (syncError) {
      setResult({
        message: syncError instanceof Error ? syncError.message : "Failed to sync",
        ok: false,
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 4000);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {result ? (
        <span
          aria-live="polite"
          className={`text-[12px] font-medium ${
            result.ok ? "text-green" : "text-red"
          }`}
        >
          {result.message}
        </span>
      ) : null}
      <button
        onClick={handleSync}
        disabled={syncing}
        className={secondaryButtonClassName}
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>
    </div>
  );
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

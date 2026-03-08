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

type ConnectorStatusMap = Record<
  string,
  { status: string; enabled: boolean; configJson: Record<string, unknown> | null }
>;

export function SettingsDestination({
  hasSlackConnected,
  slackDmEnabled,
  connectorStatus,
}: {
  hasSlackConnected: boolean;
  slackDmEnabled: boolean;
  connectorStatus: ConnectorStatusMap;
}) {
  const [slackEnabled, setSlackEnabled] = useState(slackDmEnabled);
  const [clickupEnabled, setClickupEnabled] = useState(
    connectorStatus["clickup"]?.enabled ?? false
  );
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clickup = connectorStatus["clickup"];
  const clickupConnected = clickup?.status === "CONNECTED";
  const clickupExpired = clickup?.status === "EXPIRED";
  const clickupReady = clickupConnected && !!clickup?.configJson;
  const clickupConfigLabel = getClickUpConfigLabel(clickup?.configJson ?? null);
  const activeDestinationCount =
    1 +
    Number(hasSlackConnected && slackEnabled) +
    Number(clickupReady && clickupEnabled);

  async function handleToggleSlack() {
    const newValue = !slackEnabled;
    setLoadingToggle("slack");
    setError(null);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackDmEnabled: newValue }),
      });
      if (!res.ok) {
        setError(
          await readErrorMessage(res, "Failed to update Slack delivery.")
        );
        return;
      }
      setSlackEnabled(newValue);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update Slack delivery."
      );
    } finally {
      setLoadingToggle(null);
    }
  }

  async function handleToggleConnector(connectorId: string) {
    const newValue = !clickupEnabled;
    setLoadingToggle(connectorId);
    setError(null);
    try {
      const res = await fetch(`/api/user/connectors/${connectorId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(connectorStatus[connectorId]?.configJson ?? {}),
          enabled: newValue,
        }),
      });
      if (!res.ok) {
        setError(
          await readErrorMessage(res, "Failed to update ClickUp delivery.")
        );
        return;
      }
      setClickupEnabled(newValue);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update ClickUp delivery."
      );
    } finally {
      setLoadingToggle(null);
    }
  }

  function startOAuth(path: string) {
    window.location.assign(path);
  }

  function openClickUpConfiguration() {
    window.location.assign("/dashboard/settings?configure=clickup");
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
            d="M6 12h12m0 0l-4-4m4 4l-4 4M4 6h10m-10 12h10"
          />
        </svg>
      }
      eyebrow="Delivery"
      title="Destinations"
      description="Nexus History is always on. Layer Slack and ClickUp on top when you want notifications or generated docs to flow somewhere else."
      badge={
        <StatusBadge variant={activeDestinationCount > 1 ? "connected" : "active"}>
          {activeDestinationCount} active
        </StatusBadge>
      }
      bodyClassName="space-y-3 p-6"
    >
      {error ? <SettingsNote tone="red">{error}</SettingsNote> : null}

      <SettingsItem
        tone="brand"
        icon={<DestinationGlyph label="N" className="text-brand" />}
        title="Nexus History"
        description="Every summary is stored in Nexus so you always have a built-in archive to browse from the Meetings and Notes workspaces."
        badge={<StatusBadge variant="connected">Always on</StatusBadge>}
        footer={
          <div className="flex flex-wrap gap-2">
            <SettingsMetaPill tone="brand">
              Searchable in your workspace
            </SettingsMetaPill>
          </div>
        }
      />

      <SettingsItem
        tone={hasSlackConnected ? (slackEnabled ? "brand" : "neutral") : "neutral"}
        icon={<DestinationGlyph label="S" className="text-[#7C3AED]" />}
        title="Slack DMs"
        description={
          hasSlackConnected
            ? "Send a direct message when a meeting summary is ready."
            : "Connect Slack to send direct-message alerts and unlock Quiet Mode digests."
        }
        badge={
          <StatusBadge
            variant={
              hasSlackConnected
                ? slackEnabled
                  ? "connected"
                  : "pending"
                : "pending"
            }
          >
            {hasSlackConnected
              ? slackEnabled
                ? "Sending"
                : "Connected"
              : "Not connected"}
          </StatusBadge>
        }
        action={
          hasSlackConnected ? (
            <ToggleSwitch
              enabled={slackEnabled}
              onToggle={handleToggleSlack}
              disabled={loadingToggle === "slack"}
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
          <div className="flex flex-wrap gap-2">
            <SettingsMetaPill tone={hasSlackConnected ? "brand" : "neutral"}>
              {hasSlackConnected
                ? "Pairs with workflow completion alerts"
                : "Optional destination for ready notifications"}
            </SettingsMetaPill>
          </div>
        }
      />

      <SettingsItem
        tone={
          clickupExpired
            ? "amber"
            : clickupReady && clickupEnabled
              ? "brand"
              : clickupConnected
                ? "amber"
                : "neutral"
        }
        icon={<DestinationGlyph label="C" className="text-[#4F46E5]" />}
        title="ClickUp docs"
        description={
          clickupExpired
            ? "Refresh ClickUp authorization to resume document delivery."
            : clickupReady
              ? "Create a ClickUp doc in the selected destination whenever a summary completes."
              : clickupConnected
                ? "Choose the workspace, space, and optional folder before enabling doc delivery."
                : "Connect ClickUp to turn finished summaries into project docs."
        }
        badge={
          <StatusBadge
            variant={
              clickupExpired
                ? "expired"
                : clickupReady && clickupEnabled
                  ? "connected"
                  : clickupReady
                    ? "pending"
                    : clickupConnected
                      ? "active"
                      : "pending"
            }
          >
            {clickupExpired
              ? "Expired"
              : clickupReady && clickupEnabled
                ? "Sending"
                : clickupReady
                  ? "Ready"
                  : clickupConnected
                    ? "Needs setup"
                    : "Not connected"}
          </StatusBadge>
        }
        action={
          clickupReady ? (
            <ToggleSwitch
              enabled={clickupEnabled}
              onToggle={() => handleToggleConnector("clickup")}
              disabled={loadingToggle === "clickup"}
            />
          ) : clickupExpired ? (
            <button
              onClick={() => startOAuth("/api/auth/clickup")}
              className={primaryButtonClassName}
            >
              Reconnect ClickUp
            </button>
          ) : clickupConnected ? (
            <button
              onClick={openClickUpConfiguration}
              className={secondaryButtonClassName}
            >
              Configure path
            </button>
          ) : (
            <button
              onClick={() => startOAuth("/api/auth/clickup")}
              className={primaryButtonClassName}
            >
              Connect ClickUp
            </button>
          )
        }
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {clickupConfigLabel ? (
                <SettingsMetaPill tone="brand">
                  {clickupConfigLabel}
                </SettingsMetaPill>
              ) : (
                <SettingsMetaPill tone={clickupExpired ? "amber" : "neutral"}>
                  {clickupConnected
                    ? "Destination path still needs configuration"
                    : "Optional document destination"}
                </SettingsMetaPill>
              )}
            </div>
            {clickupConnected && !clickupExpired ? (
              <button
                onClick={openClickUpConfiguration}
                className={secondaryButtonClassName}
              >
                {clickupConfigLabel ? "Change path" : "Finish setup"}
              </button>
            ) : null}
          </div>
        }
      />
    </SettingsPanel>
  );
}

function DestinationGlyph({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return <span className={`text-sm font-black ${className}`}>{label}</span>;
}

function getClickUpConfigLabel(configJson: Record<string, unknown> | null) {
  if (!configJson) return null;
  const parts = [
    configJson.workspace_name,
    configJson.space_name,
    configJson.folder_name,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" > ") : null;
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

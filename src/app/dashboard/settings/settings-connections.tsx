"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  SettingsItem,
  SettingsMetaPill,
  SettingsNote,
  SettingsPanel,
  dangerButtonClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./settings-ui";
import { ClickUpConfigModal } from "./clickup-config-modal";

type ConnectorStatusMap = Record<
  string,
  { status: string; enabled: boolean; configJson: Record<string, unknown> | null }
>;

type DisconnectableService = "slack" | "clickup";

export function SettingsConnections({
  isConnected,
  channelActive,
  channelExpiration,
  email,
  hasSlackConnected,
  connectorStatus,
}: {
  isConnected: boolean;
  channelActive: boolean;
  channelExpiration?: string;
  email?: string | null;
  hasSlackConnected: boolean;
  connectorStatus: ConnectorStatusMap;
}) {
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] =
    useState<DisconnectableService | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] =
    useState<DisconnectableService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const configure = searchParams.get("configure");
  const [configureModal, setConfigureModal] = useState<string | null>(configure);

  useEffect(() => {
    setConfigureModal(configure);
  }, [configure]);

  async function handleReconnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/channels/register", { method: "POST" });
      if (!res.ok) {
        setError(
          await readErrorMessage(
            res,
            "Failed to reconnect Google Drive capture."
          )
        );
        return;
      }
      window.location.reload();
    } catch (reconnectError) {
      setError(
        reconnectError instanceof Error
          ? reconnectError.message
          : "Failed to reconnect Google Drive capture."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(service: DisconnectableService) {
    setDisconnecting(service);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${service}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        setError(
          await readErrorMessage(
            res,
            `Failed to disconnect ${service === "slack" ? "Slack" : "ClickUp"}.`
          )
        );
        return;
      }
      window.location.reload();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : `Failed to disconnect ${
              service === "slack" ? "Slack" : "ClickUp"
            }.`
      );
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  }

  function startOAuth(path: string) {
    window.location.assign(path);
  }

  const clickup = connectorStatus["clickup"];
  const googleHealthy = isConnected && channelActive;
  const clickupConnected = clickup?.status === "CONNECTED";
  const clickupExpired = clickup?.status === "EXPIRED";
  const clickupConfigLabel = getConfigLabel("clickup", connectorStatus);
  const connectedCount = [
    googleHealthy,
    hasSlackConnected,
    clickupConnected,
  ].filter(Boolean).length;
  const channelStatusLabel = channelExpiration
    ? `${channelActive ? "Channel active until" : "Channel expired on"} ${formatDateLabel(
        channelExpiration
      )}`
    : "Push channel inactive";

  const disconnectLabels: Record<
    DisconnectableService,
    { title: string; body: string }
  > = {
    slack: {
      title: "Disconnect Slack?",
      body: "Meeting summaries will no longer be sent via Slack DM. You can reconnect at any time.",
    },
    clickup: {
      title: "Disconnect ClickUp?",
      body: "Meeting summaries will no longer create ClickUp docs. Your existing docs will not be affected. You can reconnect at any time.",
    },
  };

  return (
    <>
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
              d="M8 7V5a2 2 0 114 0v2m0 10v2a2 2 0 11-4 0v-2m8-6h2a2 2 0 110 4h-2m-10 0H4a2 2 0 110-4h2m8.243-4.243l1.414-1.414a2 2 0 112.828 2.828l-1.414 1.414M7.343 16.657l-1.414 1.414a2 2 0 11-2.828-2.828l1.414-1.414M16.657 16.657l1.414 1.414a2 2 0 11-2.828 2.828l-1.414-1.414M7.343 7.343L5.929 5.929A2 2 0 118.757 3.1l1.414 1.414"
            />
          </svg>
        }
        eyebrow="Workspace"
        title="Connections"
        description="Connect the services that feed Nexus and keep transcript capture healthy across Google Drive, Slack, and ClickUp."
        badge={
          <StatusBadge variant={googleHealthy ? "active" : "expired"}>
            {googleHealthy ? `${connectedCount}/3 connected` : "Capture needs attention"}
          </StatusBadge>
        }
        bodyClassName="space-y-4 p-6"
      >
        {error ? <SettingsNote tone="red">{error}</SettingsNote> : null}

        {!googleHealthy && (
          <SettingsNote
            tone="amber"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-semibold text-[#92400E]">
                Google Drive capture needs attention.
              </div>
              <div className="mt-1 text-sm leading-6 text-[#B45309]">
                Reconnect to restore transcript capture and refresh the push
                channel before new files are missed.
              </div>
            </div>
            <button
              onClick={handleReconnect}
              disabled={loading}
              className={primaryButtonClassName}
            >
              {loading ? "Connecting..." : "Reconnect capture"}
            </button>
          </SettingsNote>
        )}

        <div className="grid gap-3">
          <SettingsItem
            tone={googleHealthy ? "green" : "amber"}
            icon={<ProviderGlyph label="G" className="text-[#2563EB]" />}
            title="Google Drive capture"
            description={
              <>
                <div className="font-medium text-text">
                  {email ?? "Google sign-in active"}
                </div>
                <div className="mt-1 text-[12px] leading-6 text-muted2">
                  {googleHealthy
                    ? "New transcript files will keep flowing into Nexus automatically."
                    : "Reconnect to restore automated transcript capture and channel health."}
                </div>
              </>
            }
            badge={
              <StatusBadge variant={googleHealthy ? "connected" : "expired"}>
                {googleHealthy ? "Healthy" : "Needs attention"}
              </StatusBadge>
            }
            footer={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <SettingsMetaPill tone={isConnected ? "green" : "amber"}>
                    {isConnected
                      ? "Google account linked"
                      : "Google capture not registered"}
                  </SettingsMetaPill>
                  <SettingsMetaPill tone={channelActive ? "green" : "amber"}>
                    {channelStatusLabel}
                  </SettingsMetaPill>
                </div>
                {!googleHealthy ? (
                  <button
                    onClick={handleReconnect}
                    disabled={loading}
                    className={secondaryButtonClassName}
                  >
                    {loading ? "Connecting..." : "Refresh connection"}
                  </button>
                ) : null}
              </div>
            }
          />

          <SettingsItem
            tone={hasSlackConnected ? "brand" : "neutral"}
            icon={<ProviderGlyph label="S" className="text-[#7C3AED]" />}
            title="Slack"
            description={
              hasSlackConnected
                ? "Connected for delivery alerts and Quiet Mode digests."
                : "Optional integration for direct-message alerts and digest batching."
            }
            badge={
              <StatusBadge variant={hasSlackConnected ? "connected" : "pending"}>
                {hasSlackConnected ? "Connected" : "Optional"}
              </StatusBadge>
            }
            footer={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <SettingsMetaPill tone={hasSlackConnected ? "brand" : "neutral"}>
                    Delivery alerts + Quiet Mode
                  </SettingsMetaPill>
                </div>
                {hasSlackConnected ? (
                  <button
                    onClick={() => setConfirmDisconnect("slack")}
                    className={dangerButtonClassName}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => startOAuth("/api/auth/slack")}
                    className={primaryButtonClassName}
                  >
                    Connect Slack
                  </button>
                )}
              </div>
            }
          />

          <SettingsItem
            tone={clickupExpired ? "amber" : clickupConnected ? "brand" : "neutral"}
            icon={<ProviderGlyph label="C" className="text-[#4F46E5]" />}
            title="ClickUp"
            description={
              clickupExpired
                ? "Refresh authorization to resume document delivery."
                : clickupConnected
                  ? clickupConfigLabel ??
                    "Choose a workspace, space, and optional folder for new docs."
                  : "Connect ClickUp to create docs directly from meeting summaries."
            }
            badge={
              <StatusBadge
                variant={
                  clickupExpired
                    ? "expired"
                    : clickupConnected
                      ? "connected"
                      : "pending"
                }
              >
                {clickupExpired
                  ? "Expired"
                  : clickupConnected
                    ? "Connected"
                    : "Optional"}
              </StatusBadge>
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
                <div className="flex flex-wrap gap-2">
                  {clickupExpired ? (
                    <button
                      onClick={() => startOAuth("/api/auth/clickup")}
                      className={primaryButtonClassName}
                    >
                      Reconnect ClickUp
                    </button>
                  ) : clickupConnected ? (
                    <button
                      onClick={() => setConfigureModal("clickup")}
                      className={secondaryButtonClassName}
                    >
                      {clickupConfigLabel
                        ? "Change destination"
                        : "Configure destination"}
                    </button>
                  ) : (
                    <button
                      onClick={() => startOAuth("/api/auth/clickup")}
                      className={primaryButtonClassName}
                    >
                      Connect ClickUp
                    </button>
                  )}
                  {(clickupConnected || clickupExpired) && (
                    <button
                      onClick={() => setConfirmDisconnect("clickup")}
                      className={dangerButtonClassName}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </SettingsPanel>

      <Modal
        open={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        title={confirmDisconnect ? disconnectLabels[confirmDisconnect].title : "Disconnect?"}
      >
        <p className="text-sm leading-6 text-muted">
          {confirmDisconnect ? disconnectLabels[confirmDisconnect].body : ""}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setConfirmDisconnect(null)}
            className={secondaryButtonClassName}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              confirmDisconnect && handleDisconnect(confirmDisconnect)
            }
            disabled={!!disconnecting}
            className={dangerButtonClassName}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </Modal>

      <ClickUpConfigModal
        open={configureModal === "clickup"}
        onClose={() => setConfigureModal(null)}
        existingConfig={
          clickup?.configJson
            ? (clickup.configJson as {
                workspace_id: string;
                workspace_name?: string;
                space_id: string;
                space_name?: string;
                folder_id?: string;
                folder_name?: string;
              })
            : null
        }
      />
    </>
  );
}

function ProviderGlyph({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return <span className={`text-sm font-black ${className}`}>{label}</span>;
}

function getConfigLabel(
  connectorId: string,
  connectorStatus: ConnectorStatusMap
): string | null {
  const cfg = connectorStatus[connectorId]?.configJson;
  if (!cfg) return null;
  if (connectorId === "clickup") {
    const parts = [cfg.workspace_name, cfg.space_name, cfg.folder_name].filter(
      Boolean
    );
    return parts.length > 0 ? parts.join(" > ") : null;
  }
  return null;
}

function formatDateLabel(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

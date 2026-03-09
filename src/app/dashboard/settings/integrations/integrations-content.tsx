"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Modal } from "@/components/ui/modal";
import { ClickUpConfigModal } from "../clickup-config-modal";

type ConnectorStatusMap = Record<
  string,
  {
    status: string;
    enabled: boolean;
    configJson: Record<string, unknown> | null;
  }
>;

export function IntegrationsContent({
  isConnected,
  channelActive,
  channelExpiration,
  email,
  hasSlackConnected,
  slackDmEnabled,
  connectorStatus,
}: {
  isConnected: boolean;
  channelActive: boolean;
  channelExpiration?: string;
  email?: string | null;
  hasSlackConnected: boolean;
  slackDmEnabled: boolean;
  connectorStatus: ConnectorStatusMap;
}) {
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(
    null
  );
  const [slackEnabled, setSlackEnabled] = useState(slackDmEnabled);
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [configureModal, setConfigureModal] = useState<string | null>(
    searchParams.get("configure")
  );

  const clickup = connectorStatus["clickup"];
  const clickupConnected = clickup?.status === "CONNECTED";
  const clickupExpired = clickup?.status === "EXPIRED";
  const [clickupEnabled, setClickupEnabled] = useState(
    clickup?.enabled ?? false
  );
  const clickupReady =
    clickupConnected && !!clickup?.configJson;

  async function handleReconnect() {
    setReconnecting(true);
    try {
      const res = await fetch("/api/channels/register", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to register channel");
      }
    } finally {
      setReconnecting(false);
    }
  }

  async function handleDisconnect(service: string) {
    setDisconnecting(service);
    try {
      const res = await fetch(`/api/auth/${service}/disconnect`, {
        method: "POST",
      });
      if (res.ok) window.location.reload();
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  }

  async function handleToggleSlack() {
    const newValue = !slackEnabled;
    setLoadingToggle("slack");
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackDmEnabled: newValue }),
      });
      if (res.ok) setSlackEnabled(newValue);
    } finally {
      setLoadingToggle(null);
    }
  }

  async function handleToggleClickup() {
    const newValue = !clickupEnabled;
    setLoadingToggle("clickup");
    try {
      const res = await fetch("/api/user/connectors/clickup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(clickup?.configJson ?? {}),
          enabled: newValue,
        }),
      });
      if (res.ok) setClickupEnabled(newValue);
    } finally {
      setLoadingToggle(null);
    }
  }

  function getConfigLabel(): string | null {
    const cfg = clickup?.configJson;
    if (!cfg) return null;
    const parts = [cfg.workspace_name, cfg.space_name, cfg.folder_name].filter(
      Boolean
    );
    return parts.length > 0 ? (parts.join(" › ") as string) : null;
  }

  const disconnectLabels: Record<string, { title: string; body: string }> = {
    slack: {
      title: "Disconnect Slack?",
      body: "Meeting summaries will no longer be sent via Slack DM. You can reconnect at any time.",
    },
    clickup: {
      title: "Disconnect ClickUp?",
      body: "Meeting summaries will no longer create ClickUp docs. Your existing docs will not be affected.",
    },
  };

  return (
    <>
      <div className="space-y-6">
        {/* Section Header */}
        <div>
          <h2 className="text-lg font-bold text-text">Connected Apps</h2>
          <p className="mt-1 text-[13px] text-muted">
            Manage your connections to external services. Nexus uses these
            integrations to sync meetings, documents, and communications.
          </p>
        </div>

        {/* Integration Cards */}
        <div className="space-y-3">
          {/* Google Drive */}
          <IntegrationCard
            icon={
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-card-md">
                <svg
                  width="22"
                  height="20"
                  viewBox="0 0 87.3 78"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                    fill="#0066da"
                  />
                  <path
                    d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"
                    fill="#00ac47"
                  />
                  <path
                    d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 13.25z"
                    fill="#ea4335"
                  />
                  <path
                    d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                    fill="#00832d"
                  />
                  <path
                    d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                    fill="#2684fc"
                  />
                  <path
                    d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.5h27.45c0-1.55-.4-3.1-1.2-4.5z"
                    fill="#ffba00"
                  />
                </svg>
              </div>
            }
            name="Google Drive"
            description="Syncs meeting transcripts and document context."
            badgeVariant={
              isConnected
                ? channelActive
                  ? "connected"
                  : "expired"
                : "pending"
            }
            badgeText={
              isConnected
                ? channelActive
                  ? "Connected"
                  : "Channel Expired"
                : "Not Connected"
            }
            metadata={
              <>
                {channelExpiration && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted2">
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Channel expires{" "}
                    {new Date(channelExpiration).toLocaleDateString()}
                  </span>
                )}
                {email && (
                  <span className="text-[11px] text-muted2">
                    Account: {email}
                  </span>
                )}
              </>
            }
            sideStripe={
              isConnected && !channelActive ? "amber" : undefined
            }
            actions={
              !channelActive || !isConnected ? (
                <button
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  className="rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
                >
                  {reconnecting
                    ? "Connecting…"
                    : isConnected
                      ? "Reconnect Channel"
                      : "Connect"}
                </button>
              ) : (
                <button className="rounded-[9px] border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-bg hover:text-text">
                  Configure
                </button>
              )
            }
          />

          {/* Slack */}
          <IntegrationCard
            icon={
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#4A154B] shadow-card-md">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
              </div>
            }
            name="Slack"
            description="Used for Triage and sending meeting summaries via DM."
            badgeVariant={hasSlackConnected ? "connected" : "pending"}
            badgeText={hasSlackConnected ? "Connected" : "Not Connected"}
            metadata={
              hasSlackConnected ? (
                <span className="text-[11px] text-muted2">
                  DM delivery is {slackEnabled ? "enabled" : "disabled"}
                </span>
              ) : undefined
            }
            actions={
              hasSlackConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDisconnect("slack")}
                    className="rounded-[9px] border border-red/20 bg-red-lt px-4 py-2 text-xs font-medium text-red transition-colors hover:bg-red/10"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <a
                  href="/api/auth/slack"
                  className="inline-flex rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0]"
                >
                  Connect
                </a>
              )
            }
            footer={
              hasSlackConnected ? (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <div className="text-[13px] font-medium text-text">
                      Deliver summaries via Slack DM
                    </div>
                    <div className="mt-[2px] text-[11px] text-muted2">
                      Sends a DM when a meeting summary is ready
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={slackEnabled}
                    onToggle={handleToggleSlack}
                    disabled={loadingToggle === "slack"}
                  />
                </div>
              ) : undefined
            }
          />

          {/* ClickUp */}
          <IntegrationCard
            icon={
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#7B68EE] shadow-card-md">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M4.105 17.09l2.49-1.903c1.676 2.187 3.218 3.2 5.405 3.2 2.157 0 3.636-.962 5.367-3.26l2.522 1.86C17.605 20.11 15.36 21.613 12 21.613c-3.396 0-5.73-1.555-7.895-4.523z" />
                  <path d="M12 6.387l-5.398 4.45-1.604-1.95L12 3.087l7.002 5.8-1.604 1.95z" />
                </svg>
              </div>
            }
            name="ClickUp"
            description="Task creation and document sync from meeting summaries."
            badgeVariant={
              clickupExpired
                ? "expired"
                : clickupConnected
                  ? "connected"
                  : "pending"
            }
            badgeText={
              clickupExpired
                ? "Expired"
                : clickupConnected
                  ? "Connected"
                  : "Not Connected"
            }
            sideStripe={clickupExpired ? "amber" : undefined}
            metadata={
              <>
                {clickupExpired && (
                  <div className="flex items-center gap-1.5 rounded bg-amber-lt px-2 py-1 text-[11px] font-medium text-amber">
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Token expired — re-authentication required
                  </div>
                )}
                {getConfigLabel() && (
                  <span className="text-[11px] text-muted2">
                    Destination: {getConfigLabel()}
                  </span>
                )}
              </>
            }
            actions={
              clickupConnected || clickupExpired ? (
                <div className="flex items-center gap-2">
                  {clickupExpired ? (
                    <a
                      href="/api/auth/clickup"
                      className="inline-flex items-center gap-1.5 rounded-[9px] bg-amber/90 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-amber/20 transition-colors hover:bg-amber"
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Re-authenticate
                    </a>
                  ) : (
                    <button
                      onClick={() => setConfigureModal("clickup")}
                      className="rounded-[9px] border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-bg hover:text-text"
                    >
                      Configure
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDisconnect("clickup")}
                    className="rounded-[9px] border border-red/20 bg-red-lt px-4 py-2 text-xs font-medium text-red transition-colors hover:bg-red/10"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <a
                  href="/api/auth/clickup"
                  className="inline-flex rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0]"
                >
                  Connect
                </a>
              )
            }
            footer={
              clickupReady ? (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <div className="text-[13px] font-medium text-text">
                      Create ClickUp doc on ready
                    </div>
                    <div className="mt-[2px] text-[11px] text-muted2">
                      Automatically create a doc when a summary is complete
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={clickupEnabled}
                    onToggle={handleToggleClickup}
                    disabled={loadingToggle === "clickup"}
                  />
                </div>
              ) : undefined
            }
          />
        </div>

        {/* Data Privacy Footer */}
        <div className="rounded-[14px] border border-border bg-surface2 p-5">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 text-muted2">
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-text">
                Data Privacy & Security
              </h4>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Nexus only accesses data required to perform its functions. All
                tokens are encrypted at rest using AES-256. We follow strict
                security standards to protect your data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      <Modal
        open={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        title={
          disconnectLabels[confirmDisconnect ?? ""]?.title ?? "Disconnect?"
        }
      >
        <p className="text-sm text-muted2">
          {disconnectLabels[confirmDisconnect ?? ""]?.body}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setConfirmDisconnect(null)}
            className="rounded-[9px] border border-border px-4 py-2 text-xs font-medium text-muted2 transition-colors hover:bg-bg"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              confirmDisconnect && handleDisconnect(confirmDisconnect)
            }
            disabled={!!disconnecting}
            className="rounded-[9px] bg-red px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red/90 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </Modal>

      {/* ClickUp Config Modal */}
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

// ── Integration Card Component ──────────────────────────

function IntegrationCard({
  icon,
  name,
  description,
  badgeVariant,
  badgeText,
  metadata,
  actions,
  sideStripe,
  footer,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  badgeVariant: "connected" | "failed" | "pending" | "active" | "expired";
  badgeText: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  sideStripe?: "amber" | "red";
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[14px] border border-border bg-surface p-5 shadow-card transition-all hover:border-border2 ${
        badgeVariant === "pending" ? "opacity-80 hover:opacity-100" : ""
      }`}
    >
      {sideStripe && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-[3px] ${
            sideStripe === "amber" ? "bg-amber" : "bg-red"
          }`}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          {icon}
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-[14px] font-semibold text-text">{name}</h3>
              <StatusBadge variant={badgeVariant}>{badgeText}</StatusBadge>
            </div>
            <p className="mt-1 text-[12px] text-muted">{description}</p>
            {metadata && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {metadata}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {footer}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { AttioConfigModal } from "./attio-config-modal";
import { ClickUpConfigModal } from "./clickup-config-modal";

type ConnectorStatusMap = Record<
  string,
  { status: string; enabled: boolean; configJson: Record<string, unknown> | null }
>;

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
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [configureModal, setConfigureModal] = useState<string | null>(
    searchParams.get("configure")
  );

  async function handleReconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/channels/register", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to register channel");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(service: string) {
    setDisconnecting(service);
    try {
      const res = await fetch(`/api/auth/${service}/disconnect`, { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  }

  const attio = connectorStatus["attio"];
  const clickup = connectorStatus["clickup"];

  const attioConnected = attio?.status === "CONNECTED";
  const attioExpired = attio?.status === "EXPIRED";
  const clickupConnected = clickup?.status === "CONNECTED";
  const clickupExpired = clickup?.status === "EXPIRED";

  function getConfigLabel(connectorId: string): string | null {
    const cfg = connectorStatus[connectorId]?.configJson;
    if (!cfg) return null;
    if (connectorId === "attio" && cfg.parent_record_name) {
      return `Notes on ${cfg.parent_record_name}`;
    }
    if (connectorId === "clickup") {
      const parts = [cfg.workspace_name, cfg.space_name, cfg.folder_name].filter(Boolean);
      return parts.length > 0 ? parts.join(" > ") : null;
    }
    return null;
  }

  const disconnectLabels: Record<string, { title: string; body: string }> = {
    slack: {
      title: "Disconnect Slack?",
      body: "Meeting summaries will no longer be sent via Slack DM. You can reconnect at any time.",
    },
    attio: {
      title: "Disconnect Attio?",
      body: "Meeting summaries will no longer be sent to Attio. Your existing notes in Attio will not be affected. You can reconnect at any time.",
    },
    clickup: {
      title: "Disconnect ClickUp?",
      body: "Meeting summaries will no longer create ClickUp docs. Your existing docs will not be affected. You can reconnect at any time.",
    },
  };

  return (
    <>
      <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
        <div className="text-[13px] font-bold text-text">Connections</div>
        <div className="mb-[18px] text-xs text-muted2">
          Services connected to your account
        </div>

        {/* Google Account */}
        <ConnectionRow
          name="Google Account"
          detail={email ?? "Not connected"}
          badgeVariant={isConnected ? "connected" : "failed"}
          badgeText={isConnected ? "Connected" : "Disconnected"}
          hasBorder
        />

        {/* Push Channel */}
        <ConnectionRow
          name="Push Channel"
          detail={
            channelExpiration
              ? `Expires ${new Date(channelExpiration).toLocaleDateString()}`
              : "No active channel"
          }
          badgeVariant={channelActive ? "active" : "pending"}
          badgeText={channelActive ? "Active" : "Inactive"}
          hasBorder
        />

        {(!channelActive || !isConnected) && (
          <button
            onClick={handleReconnect}
            disabled={loading}
            className="mt-2 mb-3 rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect / Reconnect"}
          </button>
        )}

        {/* Slack */}
        <ConnectionRow
          name="Slack"
          detail={hasSlackConnected ? "Connected for DM delivery" : "Not connected"}
          badgeVariant={hasSlackConnected ? "connected" : "pending"}
          badgeText={hasSlackConnected ? "Connected" : "Disconnected"}
          hasBorder
          actions={
            hasSlackConnected ? (
              <ConnectedActions
                configLabel={null}
                onConfigure={undefined}
                onDisconnect={() => setConfirmDisconnect("slack")}
              />
            ) : (
              <a
                href="/api/auth/slack"
                className="rounded-[9px] bg-[#4A154B] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3d1140]"
              >
                Connect Slack
              </a>
            )
          }
        />

        {/* Attio */}
        <ConnectionRow
          name="Attio CRM"
          detail={
            attioExpired
              ? "Connection expired — reconnect to continue"
              : attioConnected
                ? getConfigLabel("attio") ?? "Connected"
                : "CRM integration for meeting notes"
          }
          badgeVariant={attioExpired ? "expired" : attioConnected ? "connected" : "pending"}
          badgeText={attioExpired ? "Expired" : attioConnected ? "Connected" : "Disconnected"}
          hasBorder
          actions={
            attioConnected || attioExpired ? (
              <ConnectedActions
                configLabel={getConfigLabel("attio")}
                onConfigure={() => setConfigureModal("attio")}
                onDisconnect={() => setConfirmDisconnect("attio")}
              />
            ) : (
              <a
                href="/api/auth/attio"
                className="rounded-[9px] bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4A3CE0]"
              >
                Connect Attio
              </a>
            )
          }
        />

        {/* ClickUp */}
        <ConnectionRow
          name="ClickUp"
          detail={
            clickupExpired
              ? "Connection needs refresh"
              : clickupConnected
                ? getConfigLabel("clickup") ?? "Connected"
                : "Create docs from meeting summaries"
          }
          badgeVariant={clickupExpired ? "expired" : clickupConnected ? "connected" : "pending"}
          badgeText={clickupExpired ? "Expired" : clickupConnected ? "Connected" : "Disconnected"}
          hasBorder={false}
          actions={
            clickupConnected || clickupExpired ? (
              <ConnectedActions
                configLabel={getConfigLabel("clickup")}
                onConfigure={() => setConfigureModal("clickup")}
                onDisconnect={() => setConfirmDisconnect("clickup")}
              />
            ) : (
              <a
                href="/api/auth/clickup"
                className="rounded-[9px] bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4A3CE0]"
              >
                Connect ClickUp
              </a>
            )
          }
        />
      </div>

      {/* Disconnect Confirmation Modal */}
      <Modal
        open={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        title={disconnectLabels[confirmDisconnect ?? ""]?.title ?? "Disconnect?"}
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
            onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
            disabled={!!disconnecting}
            className="rounded-[9px] bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </Modal>

      {/* Config Modals */}
      <AttioConfigModal
        open={configureModal === "attio"}
        onClose={() => setConfigureModal(null)}
        existingConfig={
          attio?.configJson
            ? (attio.configJson as { parent_object: string; parent_record_id: string; parent_record_name?: string })
            : null
        }
      />
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

// ── Sub-components ──────────────────────────

function ConnectionRow({
  name,
  detail,
  badgeVariant,
  badgeText,
  hasBorder,
  actions,
}: {
  name: string;
  detail: string;
  badgeVariant: "connected" | "failed" | "pending" | "active" | "expired";
  badgeText: string;
  hasBorder: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between py-[11px] ${hasBorder ? "border-b border-border" : ""}`}
    >
      <div>
        <div className="text-[13px] font-medium text-text">{name}</div>
        <div className="mt-[2px] text-[11px] text-muted2">{detail}</div>
        {actions && <div className="mt-1.5">{actions}</div>}
      </div>
      <StatusBadge variant={badgeVariant}>{badgeText}</StatusBadge>
    </div>
  );
}

function ConnectedActions({
  configLabel: _configLabel,
  onConfigure,
  onDisconnect,
}: {
  configLabel: string | null;
  onConfigure?: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {onConfigure && (
        <>
          <button
            onClick={onConfigure}
            className="text-brand hover:underline"
          >
            Configure
          </button>
          <span className="text-muted2">•</span>
        </>
      )}
      <button
        onClick={onDisconnect}
        className="text-muted2 transition-colors hover:text-red-400"
      >
        Disconnect
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

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
  const [disconnecting, setDisconnecting] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(slackDmEnabled);
  const [attioEnabled, setAttioEnabled] = useState(connectorStatus["attio"]?.enabled ?? false);
  const [clickupEnabled, setClickupEnabled] = useState(connectorStatus["clickup"]?.enabled ?? false);
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);

  const attio = connectorStatus["attio"];
  const clickup = connectorStatus["clickup"];
  const attioReady = attio?.status === "CONNECTED" && !!attio?.configJson;
  const clickupReady = clickup?.status === "CONNECTED" && !!clickup?.configJson;

  async function handleDisconnectSlack() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/slack/disconnect", { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setDisconnecting(false);
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

  async function handleToggleConnector(connectorId: string) {
    const isAttio = connectorId === "attio";
    const currentValue = isAttio ? attioEnabled : clickupEnabled;
    const newValue = !currentValue;
    setLoadingToggle(connectorId);
    try {
      const res = await fetch(`/api/user/connectors/${connectorId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(connectorStatus[connectorId]?.configJson ?? {}),
          enabled: newValue,
        }),
      });
      if (res.ok) {
        if (isAttio) setAttioEnabled(newValue);
        else setClickupEnabled(newValue);
      }
    } finally {
      setLoadingToggle(null);
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">Output Destinations</div>
      <div className="mb-[18px] text-xs text-muted2">
        Choose where your meeting summaries are delivered. Nexus History is always on. Add as many destinations as you like.
      </div>

      {/* Nexus History — always on */}
      <DestinationRow
        name="Nexus History"
        description="Always on — view in History page"
        alwaysOn
      />

      {/* Slack DM */}
      <DestinationRow
        name="Slack DM"
        description={
          hasSlackConnected
            ? "Sends a DM when summary is ready"
            : "Not connected"
        }
        available={hasSlackConnected}
        enabled={slackEnabled}
        onToggle={handleToggleSlack}
        loading={loadingToggle === "slack"}
        connectHref={hasSlackConnected ? undefined : "/api/auth/slack"}
      />

      {/* Attio CRM */}
      <DestinationRow
        name="Attio CRM"
        description={
          attioReady
            ? "Creates a note on the selected record"
            : attio?.status === "CONNECTED"
              ? "Configure a default record in Connections"
              : "Not connected"
        }
        available={attioReady}
        enabled={attioEnabled}
        onToggle={() => handleToggleConnector("attio")}
        loading={loadingToggle === "attio"}
        connectHref={attioReady ? undefined : "/api/auth/attio"}
      />

      {/* ClickUp */}
      <DestinationRow
        name="ClickUp"
        description={
          clickupReady
            ? "Creates a doc in the selected space"
            : clickup?.status === "CONNECTED"
              ? "Configure a space in Connections"
              : "Not connected"
        }
        available={clickupReady}
        enabled={clickupEnabled}
        onToggle={() => handleToggleConnector("clickup")}
        loading={loadingToggle === "clickup"}
        connectHref={clickupReady ? undefined : "/api/auth/clickup"}
        isLast
      />
    </div>
  );
}

function DestinationRow({
  name,
  description,
  alwaysOn,
  available,
  enabled,
  onToggle,
  loading,
  connectHref,
  isLast,
}: {
  name: string;
  description: string;
  alwaysOn?: boolean;
  available?: boolean;
  enabled?: boolean;
  onToggle?: () => void;
  loading?: boolean;
  connectHref?: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-[9px] border border-border bg-bg px-3 py-[9px] ${isLast ? "" : "mb-2.5"}`}
    >
      <div>
        <div className={`text-[13px] font-medium ${available || alwaysOn ? "text-text" : "text-muted2"}`}>
          {name}
        </div>
        <div className="mt-[2px] text-[11px] text-muted2">{description}</div>
      </div>
      {alwaysOn ? (
        <StatusBadge variant="connected">Always on</StatusBadge>
      ) : available ? (
        <ToggleSwitch
          enabled={enabled ?? false}
          onToggle={onToggle ?? (() => {})}
          disabled={loading}
        />
      ) : connectHref ? (
        <a
          href={connectHref}
          className="text-xs font-medium text-brand hover:underline"
        >
          Connect
        </a>
      ) : (
        <span className="text-[11px] text-muted2">Unavailable</span>
      )}
    </div>
  );
}

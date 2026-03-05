"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

export function SettingsDestination({
  hasSlackConnected,
}: {
  hasSlackConnected: boolean;
}) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/slack/disconnect", { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">Output Destinations</div>
      <div className="mb-[18px] text-xs text-muted2">
        Summaries are always saved to Nexus History. Connect additional destinations below.
      </div>

      {/* Database — always on */}
      <div className="mb-2.5 flex items-center justify-between rounded-[9px] border border-border bg-bg px-3 py-[9px]">
        <div>
          <div className="text-[13px] font-medium text-text">Nexus History</div>
          <div className="mt-[2px] text-[11px] text-muted2">
            Always on — view in History page
          </div>
        </div>
        <StatusBadge variant="connected">Active</StatusBadge>
      </div>

      {/* Slack connection */}
      <div className="flex items-center justify-between rounded-[9px] border border-border bg-bg px-3 py-[9px]">
        <div>
          <div className="text-[13px] font-medium text-text">Slack</div>
          <div className="mt-[2px] text-[11px] text-muted2">
            {hasSlackConnected
              ? "Connected — enable DM delivery in Workflows"
              : "Not connected"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant={hasSlackConnected ? "connected" : "pending"}>
            {hasSlackConnected ? "Connected" : "Disconnected"}
          </StatusBadge>
          {hasSlackConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-[9px] border border-border px-3 py-1.5 text-xs font-medium text-muted2 transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              {disconnecting ? "..." : "Disconnect"}
            </button>
          ) : (
            <a
              href="/api/auth/slack"
              className="rounded-[9px] bg-[#4A154B] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3d1140]"
            >
              Connect Slack
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

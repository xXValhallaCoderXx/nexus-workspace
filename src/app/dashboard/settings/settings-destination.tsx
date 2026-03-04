"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

export function SettingsDestination({
  selectedDestination,
  hasSlackConnected,
}: {
  selectedDestination: string;
  hasSlackConnected: boolean;
}) {
  const [destination, setDestination] = useState(selectedDestination);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDestination: destination }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

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
      <div className="text-[13px] font-bold text-text">Output Destination</div>
      <div className="mb-[18px] text-xs text-muted2">
        Where summaries are saved
      </div>
      <select
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="mb-2.5 w-full rounded-[9px] border border-border bg-bg px-3 py-[9px] font-sans text-[13px] text-text outline-none transition-colors focus:border-brand-md"
      >
        <option value="DATABASE">Database (view in History)</option>
        <option value="SLACK">Slack</option>
      </select>

      {destination === "SLACK" && (
        <div className="mb-3 flex items-center justify-between rounded-[9px] border border-border bg-bg px-3 py-[9px]">
          <div>
            <div className="text-[13px] font-medium text-text">
              Slack Account
            </div>
            <div className="mt-[2px] text-[11px] text-muted2">
              {hasSlackConnected
                ? "Connected — summaries will be sent as a DM"
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
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-xs font-medium text-green">Saved!</span>
        )}
      </div>
    </div>
  );
}


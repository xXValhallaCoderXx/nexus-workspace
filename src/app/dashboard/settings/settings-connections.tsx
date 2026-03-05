"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

export function SettingsConnections({
  isConnected,
  channelActive,
  channelExpiration,
  email,
}: {
  isConnected: boolean;
  channelActive: boolean;
  channelExpiration?: string;
  email?: string | null;
}) {
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">Connections</div>
      <div className="mb-[18px] text-xs text-muted2">
        Services connected to your account
      </div>
      <div className="flex items-center justify-between border-b border-border py-[11px]">
        <div>
          <div className="text-[13px] font-medium text-text">Google Account</div>
          <div className="mt-[2px] text-[11px] text-muted2">
            {email ?? "Not connected"}
          </div>
        </div>
        <StatusBadge variant={isConnected ? "connected" : "failed"}>
          {isConnected ? "Connected" : "Disconnected"}
        </StatusBadge>
      </div>
      <div className="flex items-center justify-between py-[11px]">
        <div>
          <div className="text-[13px] font-medium text-text">Push Channel</div>
          <div className="mt-[2px] text-[11px] text-muted2">
            {channelExpiration
              ? `Expires ${new Date(channelExpiration).toLocaleDateString()}`
              : "No active channel"}
          </div>
        </div>
        <StatusBadge variant={channelActive ? "active" : "pending"}>
          {channelActive ? "Active" : "Inactive"}
        </StatusBadge>
      </div>
      {(!channelActive || !isConnected) && (
        <button
          onClick={handleReconnect}
          disabled={loading}
          className="mt-2 rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect / Reconnect"}
        </button>
      )}
    </div>
  );
}

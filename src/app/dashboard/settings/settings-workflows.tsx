"use client";

import { useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function SettingsWorkflows({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const newValue = !isEnabled;
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingSummariesEnabled: newValue }),
      });
      if (res.ok) {
        setIsEnabled(newValue);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">Workflows</div>
      <div className="mb-[18px] text-xs text-muted2">
        Automate your meeting processing
      </div>
      <div className="flex items-center justify-between py-[11px]">
        <div>
          <div className="text-[13px] font-medium text-text">Meeting Summaries</div>
          <div className="mt-[2px] text-[11px] text-muted2">
            Auto-process new transcripts
          </div>
        </div>
        <ToggleSwitch
          enabled={isEnabled}
          onToggle={handleToggle}
          disabled={loading}
        />
      </div>
    </div>
  );
}

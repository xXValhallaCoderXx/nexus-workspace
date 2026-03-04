"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function WorkflowsPanel({ enabled }: { enabled: boolean }) {
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
    <Card>
      <CardHeader title="Workflows" />
      <div className="px-5 py-1.5">
        <div className="flex items-center justify-between py-[11px]">
          <div>
            <div className="text-[13px] font-medium text-text">
              Auto-summarise
            </div>
            <div className="mt-[2px] text-[11px] text-muted2">
              Process new transcripts automatically
            </div>
          </div>
          <ToggleSwitch
            enabled={isEnabled}
            onToggle={handleToggle}
            disabled={loading}
          />
        </div>
      </div>
    </Card>
  );
}

"use client";

import { useState } from "react";

export function SettingsDestination({
  selectedDestination,
  hasSlackWebhook,
}: {
  selectedDestination: string;
  hasSlackWebhook: boolean;
}) {
  const [destination, setDestination] = useState(selectedDestination);
  const [slackUrl, setSlackUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const body: Record<string, string> = { selectedDestination: destination };
      if (destination === "SLACK" && slackUrl) {
        body.slackWebhookUrl = slackUrl;
      }
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setSlackUrl("");
      }
    } finally {
      setLoading(false);
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
        <input
          type="url"
          placeholder={
            hasSlackWebhook
              ? "Webhook configured — enter new URL to update"
              : "Slack Webhook URL"
          }
          value={slackUrl}
          onChange={(e) => setSlackUrl(e.target.value)}
          className="mb-2 w-full rounded-[9px] border border-border bg-bg px-3 py-[9px] font-sans text-[13px] text-text outline-none transition-colors placeholder:text-muted2 focus:border-brand-md"
        />
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

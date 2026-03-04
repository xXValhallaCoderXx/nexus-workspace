"use client";

import { useState } from "react";

export function DestinationConfig({
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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900">Destination</h3>
      <div className="mt-4 space-y-4">
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="DATABASE">Database (view in History)</option>
          <option value="SLACK">Slack</option>
        </select>

        {destination === "SLACK" && (
          <div>
            <input
              type="url"
              placeholder={
                hasSlackWebhook
                  ? "Webhook configured — enter new URL to update"
                  : "Slack Webhook URL"
              }
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {hasSlackWebhook && (
              <p className="mt-1 text-xs text-green-600">
                Webhook URL configured
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="ml-2 text-sm text-green-600">Saved!</span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export function WorkflowToggle({ enabled }: { enabled: boolean }) {
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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900">Workflows</h3>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">
            Meeting Summaries
          </p>
          <p className="text-xs text-gray-500">
            Automatically process new meeting transcripts
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

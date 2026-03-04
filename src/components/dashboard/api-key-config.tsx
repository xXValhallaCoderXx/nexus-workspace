"use client";

import { useState } from "react";

export function ApiKeyConfig({ hasCustomKey }: { hasCustomKey: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(hasCustomKey);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openRouterApiKey: apiKey }),
      });
      if (res.ok) {
        setHasKey(true);
        setApiKey("");
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openRouterApiKey: null }),
      });
      if (res.ok) {
        setHasKey(false);
        setSaved(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900">
        API Key (Optional)
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        Bring your own OpenRouter API key for LLM processing
      </p>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              hasKey
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {hasKey ? "Using your key" : "Using default key"}
          </span>
        </div>
        <input
          type="password"
          placeholder="sk-or-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading || !apiKey}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          {hasKey && (
            <button
              onClick={handleClear}
              disabled={loading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
        {saved && (
          <span className="text-sm text-green-600">Key saved!</span>
        )}
      </div>
    </div>
  );
}

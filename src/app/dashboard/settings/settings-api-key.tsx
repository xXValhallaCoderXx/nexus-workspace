"use client";

import { useState } from "react";

export function SettingsApiKey({ hasCustomKey }: { hasCustomKey: boolean }) {
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
    <div className="rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">
        API Key{" "}
        <span className="font-normal text-muted2">(Optional)</span>
      </div>
      <div className="mb-[18px] text-xs text-muted2">
        Bring your own OpenRouter key for LLM processing
      </div>
      <input
        type="password"
        placeholder="sk-or-..."
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="mb-2 w-full rounded-[9px] border border-border bg-bg px-3 py-[9px] font-sans text-[13px] text-text outline-none transition-colors placeholder:text-muted2 focus:border-brand-md"
      />
      {!apiKey && !hasKey && (
        <div className="mb-2.5 flex items-center gap-1 text-[11px] text-brand">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Using the default key
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !apiKey}
          className={`rounded-[9px] px-4 py-2 text-xs font-semibold transition-colors ${
            apiKey
              ? "bg-brand text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] hover:bg-[#4A3CE0]"
              : "cursor-not-allowed border border-border bg-bg text-muted2"
          }`}
        >
          Save Key
        </button>
        {hasKey && (
          <button
            onClick={handleClear}
            disabled={loading}
            className="rounded-[9px] border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
          >
            Clear
          </button>
        )}
        {saved && (
          <span className="text-xs font-medium text-green">Saved!</span>
        )}
      </div>
    </div>
  );
}

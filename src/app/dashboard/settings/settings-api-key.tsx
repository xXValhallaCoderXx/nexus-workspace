"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  SettingsMetaPill,
  SettingsNote,
  SettingsPanel,
  primaryButtonClassName,
  subtleButtonClassName,
} from "./settings-ui";

export function SettingsApiKey({ hasCustomKey }: { hasCustomKey: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(hasCustomKey);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openRouterApiKey: apiKey }),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Failed to save API key."));
        return;
      }
      setHasKey(true);
      setApiKey("");
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save API key."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openRouterApiKey: null }),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Failed to clear API key."));
        return;
      }
      setHasKey(false);
      setApiKey("");
      setSaved(false);
    } catch (clearError) {
      setError(
        clearError instanceof Error ? clearError.message : "Failed to clear API key."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsPanel
      icon={
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 7a5 5 0 11-7.07 7.07L5 17v2h2l2.93-2.93A5 5 0 0115 7z"
          />
        </svg>
      }
      eyebrow="AI access"
      title="OpenRouter API key"
      description="Bring your own key when you want billing and model access to stay entirely under your control."
      badge={
        <StatusBadge variant={hasKey ? "connected" : "pending"}>
          {hasKey ? "Custom key saved" : "Managed default"}
        </StatusBadge>
      }
      bodyClassName="space-y-4 p-6"
    >
      {error ? <SettingsNote tone="red">{error}</SettingsNote> : null}

      <SettingsNote tone={hasKey ? "green" : "brand"}>
        {hasKey
          ? "Your OpenRouter key is encrypted at rest and used only for your account."
          : "Leave this blank to keep using the Nexus managed key for AI processing."}
      </SettingsNote>

      <div>
        <label
          htmlFor="settings-openrouter-key"
          className="mb-2 block text-sm font-semibold text-text"
        >
          OpenRouter API key
        </label>
        <input
          id="settings-openrouter-key"
          type="password"
          placeholder="sk-or-..."
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setSaved(false);
            setError(null);
          }}
          className="w-full rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted2 focus:border-brand-md"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <SettingsMetaPill tone={hasKey ? "green" : "brand"}>
            {hasKey ? "Custom key active" : "Using Nexus managed key"}
          </SettingsMetaPill>
          <SettingsMetaPill tone="neutral">Encrypted at rest</SettingsMetaPill>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saved ? (
            <span className="text-sm font-semibold text-green">Saved</span>
          ) : null}
          {hasKey && (
            <button
              onClick={handleClear}
              disabled={loading}
              className={subtleButtonClassName}
            >
              Clear key
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !apiKey}
            className={apiKey ? primaryButtonClassName : subtleButtonClassName}
          >
            {loading ? "Saving..." : "Save key"}
          </button>
        </div>
      </div>
    </SettingsPanel>
  );
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

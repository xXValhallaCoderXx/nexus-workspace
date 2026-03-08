"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MEETING_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompts/meeting-summary";
import {
  SettingsMetaPill,
  SettingsNote,
  SettingsPanel,
  primaryButtonClassName,
  subtleButtonClassName,
} from "./settings-ui";

export function SettingsModelContext({
  customSystemPrompt,
}: {
  customSystemPrompt: string | null;
}) {
  const initialValue = customSystemPrompt ?? MEETING_SUMMARY_SYSTEM_PROMPT;
  const [value, setValue] = useState(initialValue);
  const [baselineValue, setBaselineValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDefault = value === MEETING_SUMMARY_SYSTEM_PROMPT;
  const hasChanges = value !== baselineValue;

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customSystemPrompt: isDefault ? null : value,
        }),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Failed to save model context."));
        return;
      }
      setBaselineValue(value);
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save model context."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setValue(MEETING_SUMMARY_SYSTEM_PROMPT);
    setSaved(false);
    setError(null);
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
            d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H9l-5 0V6a2 2 0 012-2z"
          />
        </svg>
      }
      eyebrow="Advanced"
      title="Model context"
      description="Customize the system prompt used for meeting summarization without changing routing or delivery logic."
      badge={
        <StatusBadge variant={isDefault ? "pending" : "connected"}>
          {isDefault ? "Default prompt" : "Custom prompt"}
        </StatusBadge>
      }
      bodyClassName="space-y-5 p-6"
    >
      {error ? <SettingsNote tone="red">{error}</SettingsNote> : null}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <SettingsNote tone={isDefault ? "brand" : "green"}>
            {isDefault
              ? "The built-in prompt is tuned for structured meeting recaps. Start customizing only when you need stricter formatting, tone, or emphasis."
              : "Your custom prompt now overrides the default guidance for your account and will be used for future summaries."}
          </SettingsNote>

          <div className="rounded-[24px] border border-border bg-bg p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
              Current mode
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight text-text">
              {isDefault ? "Default summary guidance" : "Custom summary guidance"}
            </div>
            <p className="mt-2 text-[13px] leading-6 text-muted">
              Shape tone, structure, and emphasis without changing how summaries
              are routed or delivered.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SettingsMetaPill tone={isDefault ? "neutral" : "green"}>
                {isDefault ? "Nexus default" : "Custom prompt saved"}
              </SettingsMetaPill>
              <SettingsMetaPill tone="neutral">
                {value.length} characters
              </SettingsMetaPill>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="settings-model-context"
            className="mb-2 block text-sm font-semibold text-text"
          >
            System prompt
          </label>
          <textarea
            id="settings-model-context"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
              setError(null);
            }}
            rows={14}
            className="min-h-[360px] w-full rounded-[22px] border border-border bg-bg px-4 py-4 font-mono text-[13px] leading-7 text-text outline-none transition-colors placeholder:text-muted2 focus:border-brand-md"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] leading-6 text-muted">
              {hasChanges
                ? "Unsaved changes are ready to save."
                : "Saved version loaded."}
              {saved ? (
                <span className="font-semibold text-green"> Saved.</span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {!isDefault && (
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className={subtleButtonClassName}
                >
                  Reset to default
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={loading || !hasChanges}
                className={hasChanges ? primaryButtonClassName : subtleButtonClassName}
              >
                {loading ? "Saving..." : "Save prompt"}
              </button>
            </div>
          </div>
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

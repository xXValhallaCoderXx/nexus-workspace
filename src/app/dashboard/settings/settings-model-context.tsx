"use client";

import { useState } from "react";
import { MEETING_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompts/meeting-summary";

export function SettingsModelContext({
  customSystemPrompt,
}: {
  customSystemPrompt: string | null;
}) {
  const [value, setValue] = useState(
    customSystemPrompt ?? MEETING_SUMMARY_SYSTEM_PROMPT
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDefault = value === MEETING_SUMMARY_SYSTEM_PROMPT;

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customSystemPrompt: isDefault ? null : value,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setValue(MEETING_SUMMARY_SYSTEM_PROMPT);
    setSaved(false);
  }

  return (
    <div className="col-span-2 rounded-[14px] border border-border bg-surface p-[22px] shadow-card">
      <div className="text-[13px] font-bold text-text">Model Context</div>
      <div className="mb-[18px] text-xs text-muted2">
        Customize the system prompt used for meeting summarization
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={10}
        className="mb-3 w-full rounded-[9px] border border-border bg-bg px-3 py-[9px] font-mono text-[12px] leading-[1.6] text-text outline-none transition-colors placeholder:text-muted2 focus:border-brand-md"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
        >
          Save
        </button>
        {!isDefault && (
          <button
            onClick={handleReset}
            disabled={loading}
            className="rounded-[9px] border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
          >
            Reset to Default
          </button>
        )}
        {saved && (
          <span className="text-xs font-medium text-green">Saved!</span>
        )}
      </div>
    </div>
  );
}

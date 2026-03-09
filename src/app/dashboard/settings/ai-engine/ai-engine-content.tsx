"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MEETING_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompts/meeting-summary";

export function AiEngineContent({
  hasCustomKey,
  customSystemPrompt,
}: {
  hasCustomKey: boolean;
  customSystemPrompt: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-bold text-text">
          AI Pipeline Configuration
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Manage LLM providers, configure API keys, and define system prompts
          for the inference engine.
        </p>
      </div>

      {/* API Key Card */}
      <ApiKeySection hasCustomKey={hasCustomKey} />

      {/* System Prompts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-text">
            System Prompt Configuration
          </h3>
        </div>

        <div className="space-y-3">
          <PromptCard
            icon={
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            }
            title="Meetings Pipeline"
            description="Context injection for transcript summarization and action extraction."
            initialValue={
              customSystemPrompt ?? MEETING_SUMMARY_SYSTEM_PROMPT
            }
            defaultValue={MEETING_SUMMARY_SYSTEM_PROMPT}
            configKey="customSystemPrompt"
            guardrail="Avoid instruction overrides. The engine automatically appends safety layers to prevent prompt injection. Changes here only affect formatting and extraction logic."
          />
        </div>
      </div>
    </div>
  );
}

// ── API Key Section ──────────────────────────

function ApiKeySection({ hasCustomKey }: { hasCustomKey: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(hasCustomKey);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

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
    <section className="rounded-[14px] border border-border bg-surface p-5 shadow-card transition-all hover:border-border2">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-bg text-muted">
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text">
              OpenRouter API Key
            </h3>
            {hasKey && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-green">
                  AES-256 Encrypted
                </span>
              </div>
            )}
          </div>
        </div>
        {!hasKey && (
          <StatusBadge variant="pending">Optional</StatusBadge>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[12px] text-muted">
          Bring your own OpenRouter key for LLM processing. Your key is stored
          locally and encrypted at rest.
        </p>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-muted">
            API Key String
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                type={showKey ? "text" : "password"}
                placeholder="sk-or-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaved(false);
                }}
                className="w-full rounded-[9px] border border-border bg-bg py-[9px] pl-9 pr-9 font-mono text-[13px] text-text outline-none transition-colors placeholder:text-muted2 focus:border-brand-md"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted2 transition-colors hover:text-text"
              >
                {showKey ? (
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !apiKey}
              className={`shrink-0 rounded-[9px] px-5 py-[9px] text-xs font-semibold transition-colors ${
                apiKey
                  ? "bg-brand text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] hover:bg-[#4A3CE0]"
                  : "cursor-not-allowed border border-border bg-bg text-muted2"
              }`}
            >
              Update Key
            </button>
          </div>

          <div className="mt-2 flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center">
            {!apiKey && !hasKey && (
              <span className="flex items-center gap-1 text-[11px] text-brand">
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Using the default key
              </span>
            )}
            {saved && (
              <span className="text-[11px] font-medium text-green">
                Saved!
              </span>
            )}
            {hasKey && !saved && <span />}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-brand hover:underline"
            >
              Get a key from OpenRouter
              <svg
                width="9"
                height="9"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>

        {hasKey && (
          <div className="flex items-center justify-end">
            <button
              onClick={handleClear}
              disabled={loading}
              className="rounded-[9px] border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
            >
              Clear Key
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Prompt Card ──────────────────────────

function PromptCard({
  icon,
  title,
  description,
  initialValue,
  defaultValue,
  configKey,
  guardrail,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  initialValue: string;
  defaultValue: string;
  configKey: string;
  guardrail: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDefault = value === defaultValue;

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [configKey]: isDefault ? null : value,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setValue(defaultValue);
    setSaved(false);
  }

  return (
    <div className="rounded-[14px] border border-border bg-surface p-5 shadow-card transition-all hover:border-border2">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-muted">
            {icon}
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-text">{title}</h4>
            <p className="text-[11px] text-muted">{description}</p>
          </div>
        </div>
        {!isDefault && (
          <button
            onClick={handleReset}
            disabled={loading}
            className="shrink-0 rounded border border-border px-2 py-1 text-[10px] font-medium text-muted2 transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            Reset to Default
          </button>
        )}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <span className="rounded border border-border bg-bg/80 px-2 py-0.5 text-[10px] font-mono text-muted2 backdrop-blur-sm">
            markdown
          </span>
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          rows={12}
          spellCheck={false}
          className="w-full resize-none rounded-[9px] border border-border bg-bg px-4 py-3 font-mono text-[12px] leading-[1.6] text-muted outline-none transition-colors focus:border-brand-md focus:text-text"
        />
      </div>

      {/* Guardrail */}
      <div className="mt-2 flex items-start gap-2">
        <svg
          width="12"
          height="12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0 text-brand"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-[11px] leading-relaxed text-muted">
          <span className="font-semibold text-text">Guardrail:</span>{" "}
          {guardrail}
        </p>
      </div>

      {/* Save Bar */}
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
        {saved && (
          <span className="text-xs font-medium text-green">Saved!</span>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-[9px] bg-brand px-5 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)] transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

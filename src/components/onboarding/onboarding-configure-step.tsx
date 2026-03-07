"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClickUpConfigModal } from "@/app/dashboard/settings/clickup-config-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { OnboardingShell } from "./onboarding-shell";

type ConnectorState = {
  status: string;
  enabled: boolean;
  configJson: Record<string, unknown> | null;
} | null;

type ClickUpConfig = {
  workspace_id: string;
  workspace_name?: string;
  space_id: string;
  space_name?: string;
  folder_id?: string;
  folder_name?: string;
};

export function OnboardingConfigureStep({
  userImage,
  meetingSummariesEnabled,
  slackDmEnabled,
  quietModeEnabled,
  hasSlackConnected,
  clickup,
}: {
  userImage?: string | null;
  meetingSummariesEnabled: boolean;
  slackDmEnabled: boolean;
  quietModeEnabled: boolean;
  hasSlackConnected: boolean;
  clickup: ConnectorState;
}) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(meetingSummariesEnabled);
  const [isSlackDm, setIsSlackDm] = useState(slackDmEnabled);
  const [isQuietMode, setIsQuietMode] = useState(quietModeEnabled);
  const [isClickUpEnabled, setIsClickUpEnabled] = useState(clickup?.enabled ?? false);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const clickupConnected = clickup?.status === "CONNECTED";
  const clickupConfig = (clickup?.configJson as ClickUpConfig | null) ?? null;
  const clickupReady = clickupConnected && !!clickupConfig;
  const clickupPath = [
    clickupConfig?.workspace_name,
    clickupConfig?.space_name,
    clickupConfig?.folder_name,
  ]
    .filter(Boolean)
    .join(" > ");

  const readiness = useMemo(
    () => [
      {
        label: "Meeting summaries",
        ready: isEnabled,
        detail: isEnabled ? "Auto-processing is enabled" : "Turn on transcript processing",
      },
      {
        label: "Slack delivery",
        ready: hasSlackConnected && isSlackDm,
        detail: hasSlackConnected
          ? isSlackDm
            ? "DM delivery is enabled"
            : "Slack connected, but DMs are off"
          : "Slack not connected",
      },
      {
        label: "Quiet Mode",
        ready: hasSlackConnected && isQuietMode,
        detail: hasSlackConnected
          ? isQuietMode
            ? "Digest batching is enabled"
            : "Triage digests are off"
          : "Requires Slack connection",
      },
      {
        label: "ClickUp handoff",
        ready: clickupReady && isClickUpEnabled,
        detail: clickupReady
          ? isClickUpEnabled
            ? "Docs will be created in ClickUp"
            : "ClickUp connected but disabled"
          : clickupConnected
            ? "Choose a workspace before enabling"
            : "Optional — connect ClickUp anytime",
      },
    ],
    [clickupConnected, clickupReady, hasSlackConnected, isClickUpEnabled, isEnabled, isQuietMode, isSlackDm]
  );

  async function patchOnboarding(body: { step?: "connect" | "configure"; completed?: boolean }) {
    const res = await fetch("/api/user/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to update onboarding state");
    }
  }

  async function handleToggle(field: "meetingSummariesEnabled" | "slackDmEnabled" | "quietModeEnabled") {
    const setterMap = {
      meetingSummariesEnabled: setIsEnabled,
      slackDmEnabled: setIsSlackDm,
      quietModeEnabled: setIsQuietMode,
    } as const;
    const currentMap = {
      meetingSummariesEnabled: isEnabled,
      slackDmEnabled: isSlackDm,
      quietModeEnabled: isQuietMode,
    } as const;

    const nextValue = !currentMap[field];
    setLoadingField(field);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to update ${field}`);
      }

      setterMap[field](nextValue);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to update workflow settings.",
      });
    } finally {
      setLoadingField(null);
    }
  }

  async function handleToggleClickUp() {
    if (!clickupConfig) return;

    const nextValue = !isClickUpEnabled;
    setLoadingField("clickup");
    setFeedback(null);

    try {
      const res = await fetch("/api/user/connectors/clickup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clickupConfig,
          enabled: nextValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update ClickUp delivery");
      }

      setIsClickUpEnabled(nextValue);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to update ClickUp delivery.",
      });
    } finally {
      setLoadingField(null);
    }
  }

  async function handleBack() {
    setLoadingField("back");
    setFeedback(null);
    try {
      await patchOnboarding({ step: "connect" });
      router.push("/onboarding/connect");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to return to the previous step.",
      });
      setLoadingField(null);
    }
  }

  async function finishOnboarding() {
    setLoadingField("finish");
    setFeedback(null);
    try {
      await patchOnboarding({ completed: true });
      router.push("/dashboard");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to finish onboarding.",
      });
      setLoadingField(null);
    }
  }

  return (
    <>
      <OnboardingShell
        step={2}
        title="Configure your workflows"
        subtitle="Tell Nexus where to deliver your outputs and which automations should be active on day one. Everything here remains editable later in Settings."
        userImage={userImage}
        footer={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={finishOnboarding}
              disabled={loadingField !== null}
              className="text-sm font-medium text-muted2 transition-colors hover:text-text disabled:opacity-50"
            >
              Skip for now
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleBack}
                disabled={loadingField !== null}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-6 py-3 text-sm font-semibold text-text transition hover:bg-bg disabled:opacity-50"
              >
                {loadingField === "back" ? "Saving..." : "Back"}
              </button>
              <button
                type="button"
                onClick={finishOnboarding}
                disabled={loadingField !== null}
                className="inline-flex items-center justify-center rounded-2xl bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:bg-[#111C3A] disabled:opacity-50"
              >
                {loadingField === "finish" ? "Saving..." : "Enter Nexus →"}
              </button>
            </div>
          </div>
        }
      >
        <div className="mx-auto max-w-[1120px] space-y-6">
          {feedback ? (
            <div
              className={`rounded-2xl border px-5 py-4 text-sm ${
                feedback.tone === "success"
                  ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#166534]"
                  : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-border bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[26px] font-black tracking-tight text-[#0F172A]">
                    Meeting summaries
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted2">
                    Choose how Nexus should process transcripts and where completed outputs should go.
                  </p>
                </div>
                <StatusBadge variant={isEnabled ? "connected" : "pending"}>
                  {isEnabled ? "Active" : "Inactive"}
                </StatusBadge>
              </div>

              <div className="mt-6 space-y-4">
                <WorkflowRow
                  title="Meeting summaries"
                  description="Process new transcripts automatically as they arrive from Google Drive."
                  control={
                    <ToggleSwitch
                      enabled={isEnabled}
                      onToggle={() => handleToggle("meetingSummariesEnabled")}
                      disabled={loadingField !== null}
                    />
                  }
                />

                {hasSlackConnected ? (
                  <WorkflowRow
                    title="Slack DM delivery"
                    description="Send finished meeting summaries directly to your Slack DM inbox."
                    control={
                      <ToggleSwitch
                        enabled={isSlackDm}
                        onToggle={() => handleToggle("slackDmEnabled")}
                        disabled={loadingField !== null}
                      />
                    }
                  />
                ) : null}

                <WorkflowRow
                  title="ClickUp docs"
                  description={
                    clickupReady
                      ? clickupPath
                        ? `Deliver summaries to ${clickupPath}.`
                        : "Deliver summaries into the configured ClickUp space."
                      : clickupConnected
                        ? "Configure ClickUp so Nexus knows where to create docs."
                        : "Optional — connect ClickUp in the previous step."
                  }
                  control={
                    clickupReady ? (
                      <ToggleSwitch
                        enabled={isClickUpEnabled}
                        onToggle={handleToggleClickUp}
                        disabled={loadingField !== null}
                      />
                    ) : clickupConnected ? (
                      <button
                        type="button"
                        onClick={() => setConfigModalOpen(true)}
                        className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-text transition hover:bg-bg"
                      >
                        Configure
                      </button>
                    ) : (
                      <StatusBadge variant="pending">Optional</StatusBadge>
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-border bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[24px] font-black tracking-tight text-[#0F172A]">
                      Triage digest
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted2">
                      Batch Slack mentions into a quieter digest instead of getting interrupted in real time.
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={isQuietMode}
                    onToggle={() => handleToggle("quietModeEnabled")}
                    disabled={!hasSlackConnected || loadingField !== null}
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-border bg-[#F8FAFC] px-4 py-4 text-sm text-muted2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted2">
                    Current delivery window
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TimeChip label="12:00 PM UTC" />
                    <TimeChip label="4:00 PM UTC" />
                  </div>
                  <p className="mt-3 leading-6">
                    Manual sync remains available from Settings after onboarding if you want to test mention capture on demand.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#A7F3D0] bg-[#ECFDF5] p-6 shadow-[0_18px_60px_rgba(16,185,129,0.08)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#166534]">
                  Readiness check
                </div>
                <ul className="mt-4 space-y-3">
                  {readiness.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          item.ready ? "bg-[#16A34A]" : "bg-[#94A3B8]"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-semibold text-[#14532D]">
                          {item.label}
                        </div>
                        <div className="text-sm leading-6 text-[#166534]/80">
                          {item.detail}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </OnboardingShell>

      <ClickUpConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        existingConfig={clickupConfig}
      />
    </>
  );
}

function WorkflowRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-[#FBFCFD] px-4 py-4">
      <div>
        <div className="text-sm font-semibold text-text">{title}</div>
        <div className="mt-1 text-sm leading-6 text-muted2">{description}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function TimeChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text shadow-sm">
      {label}
    </span>
  );
}

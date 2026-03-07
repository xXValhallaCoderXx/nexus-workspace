"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { OnboardingShell } from "./onboarding-shell";

type ConnectorCardState = {
  status: string;
  enabled: boolean;
  configJson: Record<string, unknown> | null;
} | null;

export function OnboardingConnectStep({
  email,
  userImage,
  channelActive,
  channelExpiration,
  slack,
  clickup,
}: {
  email?: string | null;
  userImage?: string | null;
  channelActive: boolean;
  channelExpiration?: string;
  slack: ConnectorCardState;
  clickup: ConnectorCardState;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const slackConnected = slack?.status === "CONNECTED";
  const clickupConnected = clickup?.status === "CONNECTED";
  const clickupExpired = clickup?.status === "EXPIRED";

  const cards = useMemo<
    Array<{
      id: "google" | "slack" | "clickup";
      name: string;
      description: string;
      note: string;
      detail: string;
      primaryLabel: string;
      secondaryLabel: string | null;
      badge: {
        variant: "connected" | "pending" | "expired";
        label: string;
      };
    }>
  >(
    () => [
      {
        id: "google",
        name: "Google Drive",
        description: "Sync meeting transcripts and notes for summarization.",
        note:
          "Read-only access comes from your Google sign-in. Activating sync enables Drive change monitoring.",
        detail: channelActive
          ? channelExpiration
            ? `Sync active until ${new Date(channelExpiration).toLocaleDateString()}`
            : "Sync channel is active"
          : email
            ? `Signed in as ${email}`
            : "Signed in with Google",
        primaryLabel: channelActive ? "Reconnect sync" : "Activate sync",
        secondaryLabel: null,
        badge: channelActive
          ? { variant: "connected" as const, label: "Connected" }
          : { variant: "pending" as const, label: "Needs setup" },
      },
      {
        id: "slack",
        name: "Slack",
        description: "Capture mentions, sync triage, and deliver digests back to Slack.",
        note:
          "Your Slack connection powers mention search plus outbound DMs from Nexus.",
        detail: slackConnected
          ? "Connected for mention search and Slack delivery"
          : "Connect Slack to search your mentions and send digests",
        primaryLabel: slackConnected ? "Reconnect" : "Connect Slack",
        secondaryLabel: slackConnected ? "Disconnect" : null,
        badge: slackConnected
          ? { variant: "connected" as const, label: "Connected" }
          : { variant: "pending" as const, label: "Not connected" },
      },
      {
        id: "clickup",
        name: "ClickUp",
        description: "Create docs and action handoffs directly from your meeting outputs.",
        note:
          "You will choose the destination workspace in the next step after connecting ClickUp.",
        detail: clickupExpired
          ? "Connection expired — reconnect to continue creating docs"
          : clickupConnected
            ? "Connected and ready for workspace setup"
            : "Connect ClickUp to publish meeting outputs",
        primaryLabel: clickupConnected || clickupExpired ? "Reconnect" : "Connect ClickUp",
        secondaryLabel: clickupConnected ? "Disconnect" : null,
        badge: clickupExpired
          ? { variant: "expired" as const, label: "Expired" }
          : clickupConnected
            ? { variant: "connected" as const, label: "Connected" }
            : { variant: "pending" as const, label: "Not connected" },
      },
    ],
    [channelActive, channelExpiration, clickupConnected, clickupExpired, email, slackConnected]
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

  async function handleActivateGoogle() {
    setPendingAction("google");
    setFeedback(null);
    try {
      const res = await fetch("/api/channels/register", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to activate Google Drive sync");
      }
      setFeedback({
        tone: "success",
        message: "Google Drive sync is active — new transcripts will be monitored automatically.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to activate Google Drive sync.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  function startOAuth(provider: "slack" | "clickup") {
    setPendingAction(provider);
    window.location.href = `/api/auth/${provider}?returnTo=${encodeURIComponent("/onboarding/connect")}`;
  }

  async function handleDisconnect(provider: "slack" | "clickup") {
    setPendingAction(provider);
    setFeedback(null);
    try {
      const res = await fetch(`/api/auth/${provider}/disconnect`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to disconnect ${provider}`);
      }
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : `Failed to disconnect ${provider}.`,
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleNext() {
    setPendingAction("next");
    setFeedback(null);
    try {
      await patchOnboarding({ step: "configure" });
      router.push("/onboarding/configure");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to continue onboarding.",
      });
      setPendingAction(null);
    }
  }

  async function handleSkip() {
    setPendingAction("skip");
    setFeedback(null);
    try {
      await patchOnboarding({ completed: true });
      router.push("/dashboard");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to skip onboarding.",
      });
      setPendingAction(null);
    }
  }

  return (
    <OnboardingShell
      step={1}
      title="Connect your workspace"
      subtitle="Nexus needs access to your communication and file storage tools before it can organize meeting outputs. We keep every integration least-privilege and skippable."
      userImage={userImage}
      footer={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSkip}
            disabled={pendingAction !== null}
            className="text-sm font-medium text-muted2 transition-colors hover:text-text disabled:opacity-50"
          >
            Skip for now
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleNext}
              disabled={pendingAction !== null}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:bg-[#111C3A] disabled:opacity-50"
            >
              {pendingAction === "next" ? "Saving..." : "Next: Configure workflows →"}
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

        <div className="grid gap-6 xl:grid-cols-3">
          {cards.map((card) => (
            <IntegrationCard
              key={card.id}
              title={card.name}
              description={card.description}
              note={card.note}
              detail={card.detail}
              primaryLabel={card.primaryLabel}
              secondaryLabel={card.secondaryLabel}
              badge={card.badge}
              loading={pendingAction === card.id}
              onPrimaryAction={() => {
                if (card.id === "google") return handleActivateGoogle();
                if (card.id === "slack") return startOAuth("slack");
                return startOAuth("clickup");
              }}
              onSecondaryAction={
                card.id === "slack"
                  ? () => handleDisconnect("slack")
                  : card.id === "clickup" && card.secondaryLabel
                    ? () => handleDisconnect("clickup")
                    : undefined
              }
              accent={card.id}
            />
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}

function IntegrationCard({
  title,
  description,
  note,
  detail,
  primaryLabel,
  secondaryLabel,
  badge,
  loading,
  onPrimaryAction,
  onSecondaryAction,
  accent,
}: {
  title: string;
  description: string;
  note: string;
  detail: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  badge: { variant: "connected" | "pending" | "expired"; label: string };
  loading: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  accent: "google" | "slack" | "clickup";
}) {
  const iconStyle = {
    google: "from-[#E8F0FE] to-[#D1E3FF] text-[#2563EB]",
    slack: "from-[#F3E8FF] to-[#FCE7F3] text-[#7C3AED]",
    clickup: "from-[#EEF2FF] to-[#E0E7FF] text-[#4F46E5]",
  }[accent];

  return (
    <div className="rounded-[28px] border border-border bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${iconStyle} text-lg font-black`}>
          {title.charAt(0)}
        </div>
        <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
      </div>

      <h2 className="mt-6 text-[30px] font-black tracking-tight text-[#0F172A]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-7 text-muted2">{description}</p>
      <p className="mt-3 text-sm font-medium text-text">{detail}</p>

      <div className="mt-6 rounded-2xl border border-border bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-muted2">
        <span className="font-semibold text-text">Least privilege:</span> {note}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:bg-[#111C3A] disabled:opacity-50"
        >
          {loading ? "Working..." : primaryLabel}
        </button>
        {secondaryLabel && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={loading}
            className="text-sm font-medium text-muted2 transition-colors hover:text-red disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

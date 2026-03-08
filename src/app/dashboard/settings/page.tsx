import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/get-session";
import {
  getUserConfig,
  getUserPushChannels,
  getDestinationConnections,
} from "@/lib/db/scoped-queries";
import { Topbar } from "@/components/layout/topbar";
import { SettingsConnections } from "./settings-connections";
import { SettingsWorkflows } from "./settings-workflows";
import { SettingsDestination } from "./settings-destination";
import { SettingsApiKey } from "./settings-api-key";
import { SettingsModelContext } from "./settings-model-context";

export default async function SettingsPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [config, channels, destConnections] = await Promise.all([
    getUserConfig(userId),
    getUserPushChannels(userId),
    getDestinationConnections(userId),
  ]);

  const activeChannel = channels.find((c) => c.expiration > new Date());

  const connectorStatusMap = Object.fromEntries(
    destConnections.map((c) => [
      c.provider.toLowerCase(),
      {
        status: c.status,
        enabled: c.enabled,
        configJson: c.configJson as Record<string, unknown> | null,
      },
    ])
  );

  const slackConn = destConnections.find((c) => c.provider === "SLACK");
  const hasSlackConnected = slackConn?.status === "CONNECTED";
  const slackDmEnabled = slackConn?.enabled ?? false;
  const clickup = connectorStatusMap["clickup"];
  const clickupReady = clickup?.status === "CONNECTED" && !!clickup?.configJson;
  const googleCaptureReady = channels.length > 0 && !!activeChannel;
  const connectedServicesCount = [
    googleCaptureReady,
    hasSlackConnected,
    clickup?.status === "CONNECTED",
  ].filter(Boolean).length;
  const activeDestinationCount =
    1 +
    Number(hasSlackConnected && slackDmEnabled) +
    Number(clickupReady && clickup?.enabled);
  const aiProfileLabel = config?.encryptedOpenRouterKey ? "Custom" : "Shared";
  const promptProfileLabel = config?.customSystemPrompt
    ? "Custom prompt saved"
    : "Default prompt active";

  return (
    <>
      <Topbar title="Settings" subtitle="— connections, delivery, and AI" />
      <div className="flex-1 p-7">
        <div className="mx-auto max-w-[1180px] space-y-10">
          <div className="overflow-hidden rounded-[32px] border border-border bg-surface shadow-card-md">
            <div className="grid gap-6 p-7 xl:grid-cols-[minmax(0,1.4fr)_340px]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#DBD8FF] bg-brand-lt px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                  Workspace settings
                </div>
                <h1 className="mt-4 max-w-3xl text-[32px] font-black tracking-tight text-text sm:text-[38px]">
                  A cleaner command center for connections, routing, and AI
                  behavior.
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted">
                  Keep Google Drive capture healthy, tune delivery destinations,
                  and tailor how Nexus processes meeting transcripts and triage
                  digests in one light-theme workspace.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <HeroPill
                    tone={
                      config?.meetingSummariesEnabled ? "green" : "amber"
                    }
                  >
                    {config?.meetingSummariesEnabled
                      ? "Meeting summaries live"
                      : "Meeting summaries paused"}
                  </HeroPill>
                  <HeroPill
                    tone={googleCaptureReady ? "green" : "amber"}
                  >
                    {googleCaptureReady
                      ? "Google Drive capture healthy"
                      : "Reconnect Google Drive capture"}
                  </HeroPill>
                  <HeroPill
                    tone={config?.quietModeEnabled ? "brand" : "neutral"}
                  >
                    {config?.quietModeEnabled
                      ? "Quiet Mode batching enabled"
                      : "Quiet Mode batching off"}
                  </HeroPill>
                  <HeroPill
                    tone={config?.customSystemPrompt ? "brand" : "neutral"}
                  >
                    {config?.customSystemPrompt
                      ? "Custom prompt active"
                      : "Using default prompt"}
                  </HeroPill>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <SummaryTile
                  label="Connected services"
                  value={`${connectedServicesCount}/3`}
                  detail="Google Drive capture, Slack, and ClickUp coverage."
                  tone={connectedServicesCount > 1 ? "green" : "brand"}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                />
                <SummaryTile
                  label="Active deliveries"
                  value={activeDestinationCount}
                  detail="Nexus History is always on, with Slack and ClickUp layered on when enabled."
                  tone={activeDestinationCount > 1 ? "brand" : "neutral"}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 12h18M12 3l9 9-9 9"
                      />
                    </svg>
                  }
                />
                <SummaryTile
                  label="AI profile"
                  value={aiProfileLabel}
                  detail={`${promptProfileLabel} · ${
                    config?.encryptedOpenRouterKey
                      ? "Bring-your-own key saved"
                      : "Using the Nexus managed key"
                  }`}
                  tone={config?.encryptedOpenRouterKey ? "green" : "brand"}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z"
                      />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Workspace"
              title="Connections and automation"
              description="Keep transcript capture healthy, connect collaboration tools, and choose how Nexus reacts when new meetings arrive."
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <SettingsConnections
                isConnected={channels.length > 0}
                channelActive={!!activeChannel}
                channelExpiration={activeChannel?.expiration.toISOString()}
                email={session!.user.email}
                hasSlackConnected={hasSlackConnected}
                connectorStatus={connectorStatusMap}
              />
              <SettingsWorkflows
                enabled={config?.meetingSummariesEnabled ?? false}
                quietModeEnabled={config?.quietModeEnabled ?? false}
                hasSlackConnected={hasSlackConnected}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Delivery"
              title="Destinations and access"
              description="Decide where summaries land, how notifications are delivered, and which API key Nexus should use for AI processing."
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <SettingsDestination
                hasSlackConnected={hasSlackConnected}
                slackDmEnabled={slackDmEnabled}
                connectorStatus={connectorStatusMap}
              />
              <SettingsApiKey hasCustomKey={!!config?.encryptedOpenRouterKey} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Advanced"
              title="Prompt customization"
              description="Guide the summarizer with custom instructions when you need a stricter structure, different tone, or extra emphasis in the output."
            />
            <SettingsModelContext
              customSystemPrompt={config?.customSystemPrompt ?? null}
            />
          </section>
        </div>
      </div>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-[28px] font-black tracking-tight text-text">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted">
        {description}
      </p>
    </div>
  );
}

type HeroPillTone = "neutral" | "brand" | "green" | "amber";

function HeroPill({
  tone,
  children,
}: {
  tone: HeroPillTone;
  children: ReactNode;
}) {
  const classes: Record<HeroPillTone, string> = {
    neutral: "border-border bg-bg text-muted",
    brand: "border-[#DBD8FF] bg-brand-lt text-brand",
    green: "border-[#BBF7D0] bg-green-lt text-[#047857]",
    amber: "border-[#FDE68A] bg-amber-lt text-[#B45309]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

type SummaryTileTone = "neutral" | "brand" | "green";

function SummaryTile({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: SummaryTileTone;
  icon: ReactNode;
}) {
  const classes: Record<SummaryTileTone, string> = {
    neutral: "border-border bg-bg text-muted",
    brand: "border-[#DBD8FF] bg-brand-lt text-brand",
    green: "border-[#BBF7D0] bg-green-lt text-green",
  };

  return (
    <div
      className={`rounded-[24px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${classes[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/70 bg-white/80 shadow-sm">
          {icon}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
          {label}
        </div>
      </div>
      <div className="mt-5 text-[30px] font-black tracking-tight text-text">
        {value}
      </div>
      <p className="mt-1 text-[13px] leading-6 text-muted">{detail}</p>
    </div>
  );
}

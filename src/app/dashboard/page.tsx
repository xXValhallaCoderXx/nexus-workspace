import { getSession } from "@/lib/auth/get-session";
import {
  getUserConfig,
  getUserPushChannels,
  getUserChannelRenewalErrors,
  getDashboardStats,
  getRecentWorkflowRuns,
  getDestinationConnections,
} from "@/lib/db/scoped-queries";
import { Topbar } from "@/components/layout/topbar";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { RecentMeetingsPanel } from "@/components/dashboard/recent-meetings-panel";
import { ConnectionsPanel } from "@/components/dashboard/connections-panel";
import { WorkflowsPanel } from "@/components/dashboard/workflows-panel";
import { HowItWorksBox } from "@/components/dashboard/how-it-works-box";
import { ConnectorNudgeCard } from "@/components/dashboard/connector-nudge-card";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [config, channels, renewalErrors, stats, recentRuns, destConnections] =
    await Promise.all([
      getUserConfig(userId),
      getUserPushChannels(userId),
      getUserChannelRenewalErrors(userId),
      getDashboardStats(userId),
      getRecentWorkflowRuns(userId),
      getDestinationConnections(userId),
    ]);

  const activeChannel = channels.find((c) => c.expiration > new Date());
  const firstName = session!.user.name?.split(" ")[0] ?? "there";
  const dashboardSignal =
    renewalErrors.length > 0
      ? {
          label: "Drive sync needs attention",
          className: "border-[#FDE68A] bg-amber-lt text-[#B45309]",
          dotClassName: "bg-amber",
        }
      : activeChannel
        ? {
            label: "Drive sync active",
            className: "border-[#BBF7D0] bg-green-lt text-[#15803D]",
            dotClassName: "bg-green",
          }
        : {
            label: "Connect Google Drive to begin",
            className: "border-brand/10 bg-brand-lt text-brand",
            dotClassName: "bg-brand",
          };

  // Build destination connection status map
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

  // Map connector IDs for backward compat with UI
  const slackConn = destConnections.find((c) => c.provider === "SLACK");
  const hasSlackConnected = slackConn?.status === "CONNECTED";

  return (
    <>
      <Topbar title="Dashboard" subtitle="— your week at a glance" />
      <div className="flex-1 p-7">
        {renewalErrors.length > 0 && (
          <div className="mb-6">
            <AlertBanner
              message="Your Google Drive connection needs attention — reconnect your account."
              errorId={renewalErrors[0].id}
            />
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <PageHeader
            title={`Good morning, ${firstName}`}
            subtitle={`Here's what Nexus has done across your recent meetings${stats.processing > 0 ? ` — ${stats.processing} still processing` : "."}`}
          />
          <div
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3.5 py-2 text-xs font-semibold ${dashboardSignal.className}`}
          >
            <span className={`h-2 w-2 rounded-full ${dashboardSignal.dotClassName}`} />
            {dashboardSignal.label}
          </div>
        </div>

        {/* KPI Row */}
        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            icon={
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              </svg>
            }
            iconColor="brand"
            value={stats.meetingsThisWeek}
            label="Meetings this week"
            delta={`${stats.meetingsThisWeek} processed`}
          />
          <KpiCard
            icon={
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconColor="green"
            value={stats.summariesReady}
            label="Summaries ready"
            delta={`${stats.summariesReady} ready`}
          />
          <KpiCard
            icon={
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="var(--amber)" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
              </svg>
            }
            iconColor="amber"
            value={stats.processing}
            label="Currently processing"
            delta={stats.processing > 0 ? `${stats.processing} in flight` : "Queue clear"}
          />
        </div>

        {/* Two column layout */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <RecentMeetingsPanel
            meetings={recentRuns.map((r) => {
              const artifact = r.artifacts[0] ?? null;
              const inputRefs = r.inputRefJson as Record<string, unknown> | null;
              return {
                id: r.id,
                workflowType: r.workflowType,
                sourceFileName: (inputRefs?.fileName as string) ?? artifact?.title ?? null,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                resultPayload: artifact?.payloadJson as Record<string, unknown> | null,
                deliveries:
                  artifact?.deliveries.map((delivery) => ({
                    provider: delivery.provider,
                    status: delivery.status,
                  })) ?? [],
              };
            })}
          />

          <div className="flex flex-col gap-3.5">
            <ConnectionsPanel
              isConnected={channels.length > 0}
              channelActive={!!activeChannel}
              channelExpiration={activeChannel?.expiration.toISOString()}
              email={session!.user.email}
              hasSlackConnected={hasSlackConnected}
              connectorStatus={connectorStatusMap}
            />
            <WorkflowsPanel
              enabled={config?.meetingSummariesEnabled ?? false}
            />
            <HowItWorksBox />
            <ConnectorNudgeCard
              hasPmConnected={!!connectorStatusMap["clickup"]}
              meetingCount={stats.summariesReady}
              dismissed={config?.dismissedConnectorNudge ?? false}
            />
          </div>
        </div>

      </div>
    </>
  );
}

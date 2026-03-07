import { getSession } from "@/lib/auth/get-session";
import {
  getUserConfig,
  getUserPushChannels,
  getUserChannelRenewalErrors,
  getDashboardStats,
  getRecentMeetings,
  getUserConnectorConfigs,
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

  const [config, channels, renewalErrors, stats, recentMeetings, connectorConfigs] =
    await Promise.all([
      getUserConfig(userId),
      getUserPushChannels(userId),
      getUserChannelRenewalErrors(userId),
      getDashboardStats(userId),
      getRecentMeetings(userId),
      getUserConnectorConfigs(userId),
    ]);

  const activeChannel = channels.find((c) => c.expiration > new Date());
  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  const connectorStatusMap = Object.fromEntries(
    connectorConfigs.map((c) => [
      c.connectorId,
      { status: c.status, enabled: c.enabled },
    ])
  );

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

        <PageHeader
          title={`Good morning, ${firstName}`}
          subtitle={`You have ${stats.meetingsThisWeek} meeting${stats.meetingsThisWeek !== 1 ? "s" : ""} processed this week${stats.processing > 0 ? ` — ${stats.processing} still processing` : ""}`}
        />

        {/* KPI Row */}
        <div className="mb-6 grid grid-cols-3 gap-3">
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
            delta={`${stats.meetingsThisWeek} this week`}
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
            delta={stats.meetingsThisWeek > 0 ? `${Math.round((stats.summariesReady / stats.meetingsThisWeek) * 100)}% this week` : "—"}
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
            delta="—"
          />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-[1fr_340px] gap-4">
          <RecentMeetingsPanel
            meetings={recentMeetings.map((m) => ({
              id: m.id,
              sourceFileName: m.sourceFileName,
              status: m.status,
              createdAt: m.createdAt.toISOString(),
              resultPayload: m.resultPayload as Record<string, unknown> | null,
              destinationDelivered: m.destinationDelivered,
            }))}
          />

          <div className="flex flex-col gap-3.5">
            <ConnectionsPanel
              isConnected={channels.length > 0}
              channelActive={!!activeChannel}
              channelExpiration={activeChannel?.expiration.toISOString()}
              email={session!.user.email}
              hasSlackConnected={!!config?.slackUserId}
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

import { getSession } from "@/lib/auth/get-session";
import {
  getUserConfig,
  getUserPushChannels,
  getDestinationConnections,
} from "@/lib/db/scoped-queries";
import { Topbar } from "@/components/layout/topbar";
import { PageHeader } from "@/components/layout/page-header";
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

  // Build destination connection status map for client components
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

  return (
    <>
      <Topbar title="Settings" subtitle="— connections & preferences" />
      <div className="flex-1 p-7">
        <PageHeader
          title="Settings"
          subtitle="Manage your connections and preferences"
        />
        <div className="grid max-w-[760px] grid-cols-2 gap-4">
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
            slackDmEnabled={slackDmEnabled}
            hasSlackConnected={hasSlackConnected}
            connectorStatus={connectorStatusMap}
          />
          <SettingsDestination
            hasSlackConnected={hasSlackConnected}
            slackDmEnabled={slackDmEnabled}
            connectorStatus={connectorStatusMap}
          />
          <SettingsApiKey hasCustomKey={!!config?.encryptedOpenRouterKey} />
          <SettingsModelContext
            customSystemPrompt={config?.customSystemPrompt ?? null}
          />
        </div>
      </div>
    </>
  );
}

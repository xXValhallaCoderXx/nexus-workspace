import { getSession } from "@/lib/auth/get-session";
import { getUserConfig, getUserPushChannels } from "@/lib/db/scoped-queries";
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

  const [config, channels] = await Promise.all([
    getUserConfig(userId),
    getUserPushChannels(userId),
  ]);

  const activeChannel = channels.find((c) => c.expiration > new Date());

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
          />
          <SettingsWorkflows
            enabled={config?.meetingSummariesEnabled ?? false}
          />
          <SettingsDestination
            selectedDestination={config?.selectedDestination ?? "DATABASE"}
            hasSlackConnected={!!config?.slackUserId}
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

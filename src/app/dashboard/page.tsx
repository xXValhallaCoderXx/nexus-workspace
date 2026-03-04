import { getSession } from "@/lib/auth/get-session";
import { getUserConfig, getUserPushChannels, getUserChannelRenewalErrors } from "@/lib/db/scoped-queries";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { WorkflowToggle } from "@/components/dashboard/workflow-toggle";
import { DestinationConfig } from "@/components/dashboard/destination-config";
import { ApiKeyConfig } from "@/components/dashboard/api-key-config";
import { AlertBanner } from "@/components/dashboard/alert-banner";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [config, channels, renewalErrors] = await Promise.all([
    getUserConfig(userId),
    getUserPushChannels(userId),
    getUserChannelRenewalErrors(userId),
  ]);

  const activeChannel = channels.find((c) => c.expiration > new Date());

  return (
    <div className="space-y-6">
      {renewalErrors.length > 0 && (
        <AlertBanner
          message="Your Google Drive connection needs attention — reconnect your account."
          errorId={renewalErrors[0].id}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <ConnectionStatus
          isConnected={channels.length > 0}
          channelActive={!!activeChannel}
          channelExpiration={activeChannel?.expiration.toISOString()}
        />

        <WorkflowToggle
          enabled={config?.meetingSummariesEnabled ?? false}
        />

        <DestinationConfig
          selectedDestination={config?.selectedDestination ?? "DATABASE"}
          hasSlackWebhook={!!config?.encryptedSlackWebhookUrl}
        />

        <ApiKeyConfig
          hasCustomKey={!!config?.encryptedOpenRouterKey}
        />
      </div>
    </div>
  );
}

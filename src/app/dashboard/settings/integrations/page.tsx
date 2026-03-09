import { getSession } from "@/lib/auth/get-session";
import {
  getUserPushChannels,
  getDestinationConnections,
} from "@/lib/db/scoped-queries";
import { IntegrationsContent } from "./integrations-content";

export default async function IntegrationsPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [channels, destConnections] = await Promise.all([
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

  return (
    <IntegrationsContent
      isConnected={channels.length > 0}
      channelActive={!!activeChannel}
      channelExpiration={activeChannel?.expiration.toISOString()}
      email={session!.user.email}
      hasSlackConnected={hasSlackConnected}
      slackDmEnabled={slackDmEnabled}
      connectorStatus={connectorStatusMap}
    />
  );
}

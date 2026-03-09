import { getSession } from "@/lib/auth/get-session";
import {
  getUserConfig,
  getDestinationConnections,
} from "@/lib/db/scoped-queries";
import { WorkflowsContent } from "./workflows-content";

export default async function WorkflowsPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [config, destConnections] = await Promise.all([
    getUserConfig(userId),
    getDestinationConnections(userId),
  ]);

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
    <WorkflowsContent
      enabled={config?.meetingSummariesEnabled ?? false}
      slackDmEnabled={slackDmEnabled}
      quietModeEnabled={config?.quietModeEnabled ?? false}
      hasSlackConnected={hasSlackConnected}
      connectorStatus={connectorStatusMap}
    />
  );
}

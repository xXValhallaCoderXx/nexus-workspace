import { getSession } from "@/lib/auth/get-session";
import {
  getDestinationConnection,
  getPendingNotificationCount,
  getRecentTriageDigestRuns,
  getUserConfig,
} from "@/lib/db/scoped-queries";
import { Topbar } from "@/components/layout/topbar";
import { PageHeader } from "@/components/layout/page-header";
import { MentionsBoard } from "@/components/dashboard/mentions-board";
import {
  getMentionCategoryOrder,
  type MentionListItem,
} from "@/lib/utils/mention-display";
import { isDigestPayload } from "@/lib/utils/workflow-run-display";

export default async function MentionsPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [config, slackConnection, pendingCount, digestRuns] = await Promise.all([
    getUserConfig(userId),
    getDestinationConnection(userId, "SLACK"),
    getPendingNotificationCount(userId),
    getRecentTriageDigestRuns(userId),
  ]);

  const mentionItems: MentionListItem[] = digestRuns
    .flatMap((run) => {
      const artifact = run.artifacts[0] ?? null;
      const payload = artifact?.payloadJson as Record<string, unknown> | null;

      if (!artifact || !isDigestPayload(payload)) {
        return [];
      }

      const deliveries = artifact.deliveries.map((delivery) => ({
        provider: delivery.provider,
        status: delivery.status,
        externalUrl: delivery.externalUrl ?? null,
        deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
        errorMessage: delivery.errorMessage ?? null,
      }));

      return payload.messages.map((message) => ({
        id: message.id,
        digestRunId: run.id,
        digestTitle: artifact.title ?? "Triage Digest",
        digestTimeLabel: payload.digestTime,
        processedAt: run.createdAt.toISOString(),
        author: message.author,
        content: message.content,
        source: message.source,
        category: message.category,
        reason: message.reason,
        permalink: message.permalink ?? null,
        deliveries,
      }));
    })
    .sort((left, right) => {
      const timeDelta =
        new Date(right.processedAt).getTime() - new Date(left.processedAt).getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }

      return getMentionCategoryOrder(left.category) - getMentionCategoryOrder(right.category);
    })
    .slice(0, 150);

  const hasSlackConnected = slackConnection?.status === "CONNECTED";
  const quietModeEnabled = config?.quietModeEnabled ?? false;

  return (
    <>
      <Topbar title="Mentions" subtitle="— triaged Slack activity" />
      <div className="flex-1 p-7">
        <PageHeader
          title="Mentions"
          subtitle={
            pendingCount > 0
              ? `Review triaged Slack mentions and process the ${pendingCount} item queue when you're ready.`
              : "Review recent Slack mentions triaged by Nexus and open the detail panel for context."
          }
        />
        <MentionsBoard
          items={mentionItems}
          pendingCount={pendingCount}
          hasSlackConnected={hasSlackConnected}
          quietModeEnabled={quietModeEnabled}
        />
      </div>
    </>
  );
}

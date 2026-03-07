import { prisma } from "@/lib/db/prisma";
import type { SourceProvider as SourceProviderEnum } from "@/generated/prisma/enums";
import type {
  SourceProviderContract,
  NormalizedSourceEvent,
  NormalizedSourceItem,
} from "@/lib/sources/types";
import { verifySlackSignature } from "./verify-signature";
import type {
  SlackAppMentionEvent,
  SlackEventCallback,
  SlackEventsApiPayload,
} from "./types";

/**
 * Slack source provider for the Nexus omnichannel notification pipeline.
 *
 * Handles incoming Slack Events API webhooks (primarily `app_mention` events).
 * When the Nexus bot is @mentioned in a Slack workspace, this provider creates
 * PendingNotification records for all relevant users (those with quiet mode
 * enabled and a connected Slack destination).
 */
export class SlackSourceProvider implements SourceProviderContract {
  readonly provider: SourceProviderEnum = "SLACK";

  /**
   * Verify the request originated from Slack.
   *
   * Because the Request body can only be consumed once, callers must read
   * the raw body beforehand and pass it as `connectionMeta.rawBody`.
   */
  verifyRequest(
    request: Request,
    connectionMeta: unknown
  ): boolean {
    const meta = connectionMeta as { rawBody: string } | null;
    if (!meta?.rawBody) {
      return false;
    }
    return verifySlackSignature(request, meta.rawBody);
  }

  /**
   * For Slack @mention events, user resolution is not 1:1 — a single
   * webhook may concern multiple Nexus users. Use `getRelevantUsers()`
   * from the webhook route instead.
   */
  async resolveConnection(
    _request: Request
  ): Promise<{ userId: string; sourceConnectionId: string } | null> {
    return null;
  }

  /**
   * Normalize a Slack event_callback into a canonical NormalizedSourceEvent.
   */
  async normalizeEvent(
    request: Request,
    context: { userId: string; sourceConnectionId: string }
  ): Promise<NormalizedSourceEvent> {
    const payload = (await request.json()) as SlackEventCallback;
    const event = payload.event;

    return {
      userId: context.userId,
      sourceConnectionId: context.sourceConnectionId,
      provider: "SLACK",
      eventType: event.type,
      externalEventId: payload.event_id,
      dedupeKey: `slack:${payload.team_id}:${payload.event_id}`,
      rawPayload: payload as unknown as Record<string, unknown>,
      normalizedMetadata: {
        channel: event.channel,
        user: event.user,
        text: event.text,
        teamId: payload.team_id,
        eventTs: event.event_ts,
      },
    };
  }

  /**
   * Not used for the Slack @mention flow — PendingNotification records
   * are created directly by the webhook route.
   */
  async buildSourceItems(
    _userId: string,
    _sourceConnectionId: string,
    _eventMetadata: Record<string, unknown>
  ): Promise<NormalizedSourceItem[]> {
    return [];
  }

  // ── Slack-specific helpers ──────────────────────────────

  /**
   * Find all Nexus users who should receive a notification for an event
   * originating from the given Slack workspace (team).
   *
   * Criteria:
   *  - User has quiet mode enabled
   *  - User has a connected Slack DestinationConnection
   *    (proves they are in the workspace)
   */
  async getRelevantUsers(
    teamId: string
  ): Promise<Array<{ userId: string; sourceConnectionId: string }>> {
    const users = await prisma.user.findMany({
      where: {
        config: { quietModeEnabled: true },
        destinationConnections: {
          some: {
            provider: "SLACK",
            status: "CONNECTED",
          },
        },
        sourceConnections: {
          some: { provider: "SLACK" },
        },
      },
      include: {
        sourceConnections: {
          where: { provider: "SLACK" },
          select: { id: true, configJson: true },
        },
      },
    });

    // Filter to users whose Slack source connection matches this workspace
    return users
      .filter((u) => {
        const slackConn = u.sourceConnections[0];
        if (!slackConn?.configJson) return false;
        const config = slackConn.configJson as Record<string, unknown>;
        return config.teamId === teamId;
      })
      .map((u) => ({
        userId: u.id,
        sourceConnectionId: u.sourceConnections[0].id,
      }));
  }

  /**
   * Extract notification-ready data from a Slack app_mention event.
   */
  parseEventToNotification(event: SlackAppMentionEvent): {
    connectorId: string;
    externalMessageId: string;
    authorName: string;
    content: string;
    metadata: Record<string, unknown>;
  } {
    return {
      connectorId: "slack",
      externalMessageId: event.ts,
      authorName: event.user,
      content: event.text,
      metadata: {
        channel: event.channel,
        eventTs: event.event_ts,
        team: event.team,
      },
    };
  }

  /**
   * Type-guard: check whether a parsed payload is an event_callback.
   */
  static isEventCallback(
    payload: SlackEventsApiPayload
  ): payload is SlackEventCallback {
    return payload.type === "event_callback";
  }

  /**
   * Type-guard: check whether a parsed payload is a url_verification challenge.
   */
  static isUrlVerification(
    payload: SlackEventsApiPayload
  ): payload is SlackEventsApiPayload & { type: "url_verification" } {
    return payload.type === "url_verification";
  }
}

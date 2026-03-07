import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  getPendingNotificationsByUser,
  getDestinationConnection,
  createPendingNotification,
} from "@/lib/db/scoped-queries";
import { processUserDigest } from "@/lib/workflows/process-digest";
import { fetchRecentMentions } from "@/lib/sources/slack/fetch-mentions";
import { decrypt } from "@/lib/crypto/encryption";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // ── Step 1: Pull recent mentions from Slack via search.messages ──
  let fetchedFromSlack = 0;
  const slackConn = await getDestinationConnection(userId, "SLACK");

  if (slackConn?.externalAccountId && slackConn.oauthTokensEncrypted) {
    const { access_token } = JSON.parse(
      decrypt(slackConn.oauthTokensEncrypted)
    ) as { access_token: string };

    const mentions = await fetchRecentMentions(
      slackConn.externalAccountId,
      access_token
    );

    for (const mention of mentions) {
      try {
        await createPendingNotification({
          userId,
          connectorId: "slack",
          externalMessageId: `${mention.channelId}:${mention.messageTs}`,
          authorName: mention.authorName,
          content: mention.content,
          metadata: {
            channel: mention.channelId,
            channelName: mention.channelName,
            ts: mention.messageTs,
            threadTs: mention.threadTs,
            permalink: mention.permalink,
          },
        });
        fetchedFromSlack++;
      } catch (error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError.code !== "P2002") throw error; // skip duplicates
      }
    }
  }

  // ── Step 2: Process all pending notifications ──
  const notifications = await getPendingNotificationsByUser(userId);

  if (notifications.length === 0) {
    return NextResponse.json({
      success: true,
      messageCount: 0,
      fetchedFromSlack,
      message:
        fetchedFromSlack === 0
          ? "No mentions found. Re-connect Slack in Settings to grant search access."
          : "Fetched mentions but they were already processed",
    });
  }

  try {
    const result = await processUserDigest(userId, notifications, "MANUAL");

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Processing failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageCount: result.messageCount,
      fetchedFromSlack,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      JSON.stringify({
        level: "error",
        event: "manual_triage_failed",
        userId,
        error: message,
      })
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

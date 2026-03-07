import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyGoogleDriveWebhook } from "@/lib/google/verify-webhook";
import { isDuplicate } from "@/lib/redis/deduplication";
import { enqueueTranscriptJob } from "@/lib/queue/enqueue";
import { detectChangedFiles } from "@/lib/google/fetch-transcript";
import {
  getUserConfig,
  getSourceConnection,
  upsertSourceConnection,
  createSourceEvent,
  updateSourceEvent,
  upsertSourceItem,
} from "@/lib/db/scoped-queries";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");
  const messageNumber = request.headers.get("x-goog-message-number");

  console.log(
    JSON.stringify({
      level: "info",
      event: "webhook_received",
      channelId,
      resourceId,
      resourceState,
    })
  );

  // Ignore sync events
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  // Only process change/update events
  if (resourceState !== "change" && resourceState !== "update") {
    return NextResponse.json({ ok: true });
  }

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Look up channel
  const channel = await prisma.pushChannel.findUnique({
    where: { channelId },
  });

  if (!channel) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  // Verify signature
  if (!verifyGoogleDriveWebhook(channelToken, channel.watchToken)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Deduplication
  const changeToken = `${resourceId}:${resourceState}:${messageNumber ?? "unknown"}`;
  if (await isDuplicate(resourceId, changeToken)) {
    console.log(
      JSON.stringify({ level: "info", event: "duplicate_webhook", channelId })
    );
    return NextResponse.json({ ok: true });
  }

  const userId = channel.userId;

  // Check user config
  const config = await getUserConfig(userId);
  if (!config?.meetingSummariesEnabled) {
    return NextResponse.json({ ok: true });
  }

  // Ensure SourceConnection exists for this user's Google Drive
  const sourceConnection = await upsertSourceConnection(
    userId,
    "GOOGLE_DRIVE",
    { status: "CONNECTED" }
  );

  // Create SourceEvent
  const sourceEvent = await createSourceEvent({
    userId,
    sourceConnectionId: sourceConnection.id,
    provider: "GOOGLE_DRIVE",
    eventType: resourceState,
    externalEventId: `${channelId}:${messageNumber}`,
    dedupeKey: changeToken,
    rawPayload: { channelId, resourceId, resourceState, messageNumber },
    status: "RECEIVED",
  });

  // Get page token from source connection config
  const connectionConfig = sourceConnection.configJson as Record<string, unknown> | null;
  const pageToken = connectionConfig?.drivePageToken as string | undefined;

  // Detect changed files
  const { files, newPageToken } = await detectChangedFiles(userId, pageToken);

  // Update page token in source connection config
  await upsertSourceConnection(userId, "GOOGLE_DRIVE", {
    configJson: { ...(connectionConfig ?? {}), drivePageToken: newPageToken },
  });

  // Update source event status
  await updateSourceEvent(sourceEvent.id, {
    status: "QUEUED",
    normalizedMetadata: { filesDetected: files.length },
  });

  // Create source items and enqueue jobs
  for (const file of files) {
    // Create/update SourceItem
    await upsertSourceItem({
      userId,
      sourceConnectionId: sourceConnection.id,
      provider: "GOOGLE_DRIVE",
      itemType: "TRANSCRIPT",
      externalItemId: file.id,
      title: file.name,
      sourceUrl: `https://drive.google.com/file/d/${file.id}/view`,
    });

    // Enqueue workflow
    await enqueueTranscriptJob({
      userId,
      fileId: file.id,
      fileName: file.name,
      sourceEventId: sourceEvent.id,
      sourceConnectionId: sourceConnection.id,
      resourceId,
      channelId,
    });

    console.log(
      JSON.stringify({
        level: "info",
        event: "job_enqueued",
        userId,
        fileId: file.id,
        fileName: file.name,
      })
    );
  }

  // Mark event processed
  await updateSourceEvent(sourceEvent.id, {
    status: "PROCESSED",
    processedAt: new Date(),
  });

  return NextResponse.json({ ok: true, filesQueued: files.length });
}

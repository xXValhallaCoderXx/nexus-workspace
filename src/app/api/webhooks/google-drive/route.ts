import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyGoogleDriveWebhook } from "@/lib/google/verify-webhook";
import { isDuplicate } from "@/lib/redis/deduplication";
import { enqueueTranscriptJob } from "@/lib/queue/enqueue";
import { detectChangedFiles } from "@/lib/google/fetch-transcript";
import { upsertUserConfig, getUserConfig } from "@/lib/db/scoped-queries";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");

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
  const changeToken = `${resourceId}:${resourceState}:${Date.now().toString(36)}`;
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

  // Detect changed files
  const { files, newPageToken } = await detectChangedFiles(
    userId,
    config.drivePageToken
  );

  // Update page token for next change detection
  await upsertUserConfig(userId, { drivePageToken: newPageToken });

  // Enqueue a job for each transcript file
  for (const file of files) {
    await enqueueTranscriptJob({
      userId,
      fileId: file.id,
      fileName: file.name,
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

  return NextResponse.json({ ok: true, filesQueued: files.length });
}

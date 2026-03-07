import { NextRequest, NextResponse } from "next/server";
import { getSourceProvider } from "@/lib/sources/registry";
import { createPendingNotification } from "@/lib/db/scoped-queries";
import { prisma } from "@/lib/db/prisma";
import type { SlackEventsApiPayload, SlackAppMentionEvent } from "@/lib/sources/slack/types";

// Register source providers on module load
import "@/lib/sources/slack/register";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params;

  const rawBody = await request.text();

  // ── Slack-specific: URL verification challenge ──
  if (connectorId === "slack") {
    try {
      const payload = JSON.parse(rawBody) as SlackEventsApiPayload;
      if (payload.type === "url_verification") {
        return NextResponse.json({ challenge: payload.challenge });
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  // ── Resolve provider ──
  const provider = getSourceProvider(connectorId);
  if (!provider) {
    return NextResponse.json(
      { error: `Unknown connector: ${connectorId}` },
      { status: 404 }
    );
  }

  // ── Verify request signature ──
  const isValid = provider.verifyRequest(request, { rawBody });
  if (!isValid) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "webhook_signature_invalid",
        connectorId,
      })
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Parse and process the event ──
  try {
    const payload = JSON.parse(rawBody);

    if (connectorId === "slack" && payload.type === "event_callback") {
      return await handleSlackEvent(payload);
    }

    // Generic connector path (future connectors)
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      JSON.stringify({
        level: "error",
        event: "webhook_processing_error",
        connectorId,
        error: message,
      })
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleSlackEvent(
  payload: { event: SlackAppMentionEvent; event_id: string }
) {
  const event = payload.event;

  if (event.type !== "app_mention") {
    return NextResponse.json({ ok: true });
  }

  // Find all Nexus users with quiet mode enabled and a Slack destination connection
  const quietModeUsers = await prisma.user.findMany({
    where: {
      config: { quietModeEnabled: true },
      destinationConnections: {
        some: { provider: "SLACK", status: "CONNECTED", enabled: true },
      },
    },
    select: {
      id: true,
      destinationConnections: {
        where: { provider: "SLACK" },
        select: { externalAccountId: true },
      },
    },
  });

  // Create pending notification for each relevant user
  for (const user of quietModeUsers) {
    const permalink = event.channel
      ? `https://slack.com/archives/${event.channel}/p${event.ts.replace(".", "")}`
      : undefined;

    await createPendingNotification({
      userId: user.id,
      connectorId: "slack",
      externalMessageId: payload.event_id,
      authorName: event.user,
      content: event.text,
      metadata: {
        channel: event.channel,
        ts: event.ts,
        permalink,
        team: event.team,
      },
    });
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "slack_mention_ingested",
      eventId: payload.event_id,
      usersNotified: quietModeUsers.length,
    })
  );

  return NextResponse.json({ ok: true });
}

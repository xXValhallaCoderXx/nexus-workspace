import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  registerPushChannel,
  stopChannel,
} from "@/lib/google/channel-registration";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const expiringChannels = await prisma.pushChannel.findMany({
    where: {
      expiration: { lt: twentyFourHoursFromNow },
    },
  });

  console.log(
    JSON.stringify({
      level: "info",
      event: "cron_renew_channels_start",
      count: expiringChannels.length,
    })
  );

  const results: Array<{ channelId: string; success: boolean; error?: string }> = [];

  for (const channel of expiringChannels) {
    try {
      // Stop old channel
      await stopChannel(channel.userId, channel.channelId, channel.resourceId);

      // Register new channel
      await registerPushChannel(channel.userId);

      results.push({ channelId: channel.channelId, success: true });

      console.log(
        JSON.stringify({
          level: "info",
          event: "channel_renewed",
          userId: channel.userId,
          oldChannelId: channel.channelId,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      await prisma.channelRenewalError.create({
        data: {
          userId: channel.userId,
          channelId: channel.channelId,
          errorMessage: message,
        },
      });

      results.push({
        channelId: channel.channelId,
        success: false,
        error: message,
      });

      console.error(
        JSON.stringify({
          level: "error",
          event: "channel_renewal_failed",
          userId: channel.userId,
          channelId: channel.channelId,
          error: message,
        })
      );
    }
  }

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

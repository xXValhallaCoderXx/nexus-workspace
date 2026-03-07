import { NextRequest, NextResponse } from "next/server";
import {
  getPendingNotificationsGroupedByUser,
  deletePendingNotifications,
  getUserConfig,
} from "@/lib/db/scoped-queries";
import {
  processUserDigest,
  type DigestProcessResult,
} from "@/lib/workflows/process-digest";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      JSON.stringify({ level: "error", event: "cron_secret_missing" })
    );
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const grouped = await getPendingNotificationsGroupedByUser();

  if (grouped.size === 0) {
    return NextResponse.json({ processed: 0, message: "No pending notifications" });
  }

  const results: DigestProcessResult[] = [];

  for (const [userId, notifications] of grouped) {
    try {
      // Check if user still has quiet mode enabled
      const config = await getUserConfig(userId);
      if (!config?.quietModeEnabled) {
        await deletePendingNotifications(notifications.map((n) => n.id));
        results.push({
          userId,
          messageCount: notifications.length,
          success: true,
          error: "Quiet mode disabled — cleaned up",
        });
        continue;
      }

      const result = await processUserDigest(userId, notifications, "CRON");
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        JSON.stringify({
          level: "error",
          event: "triage_digest_failed",
          userId,
          error: message,
        })
      );
      results.push({
        userId,
        messageCount: notifications.length,
        success: false,
        error: message,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

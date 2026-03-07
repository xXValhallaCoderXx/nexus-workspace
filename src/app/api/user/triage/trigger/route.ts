import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getPendingNotificationsByUser } from "@/lib/db/scoped-queries";
import { processUserDigest } from "@/lib/workflows/process-digest";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const notifications = await getPendingNotificationsByUser(userId);

  if (notifications.length === 0) {
    return NextResponse.json({
      success: true,
      messageCount: 0,
      message: "No pending notifications to process",
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

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertUserConfig } from "@/lib/db/scoped-queries";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await upsertUserConfig(session.user.id, { slackUserId: null });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getUserPushChannels } from "@/lib/db/scoped-queries";
import { registerPushChannel } from "@/lib/google/channel-registration";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await getUserPushChannels(session.user.id);
  return NextResponse.json({ channels });
}

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const channel = await registerPushChannel(session.user.id);
    return NextResponse.json({ channel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register channel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

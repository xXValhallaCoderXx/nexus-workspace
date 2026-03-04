import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { registerPushChannel } from "@/lib/google/channel-registration";

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

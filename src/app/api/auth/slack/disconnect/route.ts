import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { deleteDestinationConnection } from "@/lib/db/scoped-queries";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteDestinationConnection(session.user.id, "SLACK");

  return NextResponse.json({ success: true });
}

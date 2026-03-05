import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { deleteConnectorConfig } from "@/lib/db/scoped-queries";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ClickUp tokens don't support server-side revocation — just delete config
  await deleteConnectorConfig(session.user.id, "clickup");

  return NextResponse.json({ success: true });
}

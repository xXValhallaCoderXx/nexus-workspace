import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { connectorFetch } from "@/lib/connectors/connector-auth";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await connectorFetch(
      session.user.id,
      "attio",
      "https://api.attio.com/v2/objects"
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Attio objects" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

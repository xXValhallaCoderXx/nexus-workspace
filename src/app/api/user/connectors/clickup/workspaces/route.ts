import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { destinationFetch } from "@/lib/db/scoped-queries";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await destinationFetch(
      session.user.id,
      "CLICKUP",
      "https://api.clickup.com/api/v2/team"
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ClickUp workspaces" },
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

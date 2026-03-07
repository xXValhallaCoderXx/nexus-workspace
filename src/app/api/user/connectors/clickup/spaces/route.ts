import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { connectorFetch } from "@/lib/connectors/connector-auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 }
    );
  }

  try {
    const res = await connectorFetch(
      session.user.id,
      "clickup",
      `https://api.clickup.com/api/v2/team/${workspaceId}/space?archived=false`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ClickUp spaces" },
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

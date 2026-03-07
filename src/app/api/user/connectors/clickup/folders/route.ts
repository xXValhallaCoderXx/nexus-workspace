import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { destinationFetch } from "@/lib/db/scoped-queries";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const spaceId = searchParams.get("spaceId");

  if (!spaceId) {
    return NextResponse.json(
      { error: "spaceId is required" },
      { status: 400 }
    );
  }

  try {
    const res = await destinationFetch(
      session.user.id,
      "CLICKUP",
      `https://api.clickup.com/api/v2/space/${spaceId}/folder?archived=false`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ClickUp folders" },
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

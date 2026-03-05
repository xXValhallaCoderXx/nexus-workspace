import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { connectorFetch } from "@/lib/connectors/connector-auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { objectType, query } = body;

  if (!objectType) {
    return NextResponse.json(
      { error: "objectType is required" },
      { status: 400 }
    );
  }

  try {
    const res = await connectorFetch(
      session.user.id,
      "attio",
      `https://api.attio.com/v2/objects/${objectType}/records/query`,
      {
        method: "POST",
        body: JSON.stringify({
          filter: query
            ? { name: { $contains: query } }
            : undefined,
          limit: 25,
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to query Attio records" },
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

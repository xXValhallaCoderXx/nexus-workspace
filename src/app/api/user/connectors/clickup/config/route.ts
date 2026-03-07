import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertDestinationConnection } from "@/lib/db/scoped-queries";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    workspace_id,
    workspace_name,
    space_id,
    space_name,
    folder_id,
    folder_name,
    enabled,
  } = body;

  if (!workspace_id || !space_id) {
    return NextResponse.json(
      { error: "workspace_id and space_id are required" },
      { status: 400 }
    );
  }

  await upsertDestinationConnection(session.user.id, "CLICKUP", {
    configJson: {
      workspace_id,
      workspace_name: workspace_name ?? null,
      space_id,
      space_name: space_name ?? null,
      folder_id: folder_id ?? null,
      folder_name: folder_name ?? null,
    },
    enabled: enabled ?? true,
  });

  return NextResponse.json({ success: true });
}

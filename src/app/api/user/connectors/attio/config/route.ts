import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertConnectorConfig } from "@/lib/db/scoped-queries";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { parent_object, parent_record_id, parent_record_name } = body;

  if (!parent_object || !parent_record_id) {
    return NextResponse.json(
      { error: "parent_object and parent_record_id are required" },
      { status: 400 }
    );
  }

  await upsertConnectorConfig(session.user.id, "attio", {
    configJson: {
      parent_object,
      parent_record_id,
      parent_record_name: parent_record_name ?? null,
      matching_strategy: "manual",
    },
    enabled: true,
  });

  return NextResponse.json({ success: true });
}

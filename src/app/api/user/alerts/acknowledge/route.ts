import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth/get-session";
import { acknowledgeChannelRenewalError } from "@/lib/db/scoped-queries";

const schema = z.object({
  errorId: z.string(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await acknowledgeChannelRenewalError(parsed.data.errorId, session.user.id);
  return NextResponse.json({ success: true });
}

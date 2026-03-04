import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getUserJobHistory } from "@/lib/db/scoped-queries";
import type { JobStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const status = searchParams.get("status") as JobStatus | null;

  const result = await getUserJobHistory(session.user.id, {
    page,
    limit,
    status: status ?? undefined,
  });

  return NextResponse.json(result);
}

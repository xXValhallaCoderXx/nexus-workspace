import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getJobById } from "@/lib/db/scoped-queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await getJobById(id, session.user.id);

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...job,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    deliveryLogs: job.deliveryLogs.map((dl) => ({
      id: dl.id,
      connectorId: dl.connectorId,
      status: dl.status,
      errorMessage: dl.errorMessage,
      deliveredAt: dl.deliveredAt?.toISOString() ?? null,
      retryCount: dl.retryCount,
    })),
  });
}

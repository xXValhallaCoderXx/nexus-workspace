import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getWorkflowRunById } from "@/lib/db/scoped-queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const run = await getWorkflowRunById(id, session.user.id);

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const artifact = run.artifacts[0] ?? null;
  const inputRefs = run.inputRefJson as Record<string, unknown> | null;

  return NextResponse.json({
    id: run.id,
    sourceFileId: inputRefs?.fileId ?? "",
    sourceFileName: inputRefs?.fileName ?? artifact?.title ?? null,
    status: run.status,
    resultPayload: artifact?.payloadJson ?? null,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    deliveryLogs: artifact?.deliveries.map((dl) => ({
      id: dl.id,
      connectorId: dl.provider,
      status: dl.status,
      errorMessage: dl.errorMessage,
      externalUrl: dl.externalUrl ?? null,
      deliveredAt: dl.deliveredAt?.toISOString() ?? null,
      retryCount: dl.retryCount,
    })) ?? [],
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getWorkflowRunHistory } from "@/lib/db/scoped-queries";
import type { RunStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const status = searchParams.get("status") as RunStatus | null;
  const search = searchParams.get("search") || undefined;

  const result = await getWorkflowRunHistory(session.user.id, {
    page,
    limit,
    status: status ?? undefined,
    search,
  });

  // Map to API response shape
  const jobs = result.runs.map((run) => {
    const artifact = run.artifacts[0] ?? null;
    const inputRefs = run.inputRefJson as Record<string, unknown> | null;
    return {
      id: run.id,
      workflowType: run.workflowType,
      sourceFileId: inputRefs?.fileId ?? "",
      sourceFileName: inputRefs?.fileName ?? artifact?.title ?? null,
      status: run.status,
      resultPayload: artifact?.payloadJson ?? null,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    jobs,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  });
}

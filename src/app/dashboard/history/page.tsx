import { Suspense } from "react";
import { getSession } from "@/lib/auth/get-session";
import { getWorkflowRunHistory } from "@/lib/db/scoped-queries";
import { Topbar } from "@/components/layout/topbar";
import { PageHeader } from "@/components/layout/page-header";
import { HistoryFilterBar } from "@/components/dashboard/history-filter-bar";
import { HistoryTable } from "@/components/dashboard/history-table";
import type { RunStatus } from "@/generated/prisma/enums";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const status = params.status as RunStatus | undefined;
  const search = params.search || undefined;

  const result = await getWorkflowRunHistory(session!.user.id, {
    page,
    limit: 20,
    status,
    search,
  });

  return (
    <>
      <Topbar title="History" subtitle="— all processed meetings" />
      <div className="flex-1 p-7">
        <PageHeader
          title="Meeting History"
          subtitle="All your processed transcripts"
        />
        <Suspense>
          <HistoryFilterBar />
        </Suspense>
        <HistoryTable
          jobs={result.runs.map((r) => {
            const artifact = r.artifacts[0] ?? null;
            const inputRefs = r.inputRefJson as Record<string, unknown> | null;
            return {
              id: r.id,
              workflowType: r.workflowType,
              sourceFileId: (inputRefs?.fileId as string) ?? "",
              sourceFileName: (inputRefs?.fileName as string) ?? artifact?.title ?? null,
              status: r.status,
              resultPayload: artifact?.payloadJson as Record<string, unknown> | null,
              errorMessage: r.errorMessage,
              createdAt: r.createdAt.toISOString(),
              completedAt: r.completedAt?.toISOString() ?? null,
            };
          })}
          currentPage={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </>
  );
}

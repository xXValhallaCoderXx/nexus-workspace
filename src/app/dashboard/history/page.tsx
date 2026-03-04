import { Suspense } from "react";
import { getSession } from "@/lib/auth/get-session";
import { getUserJobHistory } from "@/lib/db/scoped-queries";
import { Topbar } from "@/components/layout/topbar";
import { PageHeader } from "@/components/layout/page-header";
import { HistoryFilterBar } from "@/components/dashboard/history-filter-bar";
import { HistoryTable } from "@/components/dashboard/history-table";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const status = params.status as
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | undefined;
  const search = params.search || undefined;

  const result = await getUserJobHistory(session!.user.id, {
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
          jobs={result.jobs.map((j) => ({
            ...j,
            createdAt: j.createdAt.toISOString(),
            completedAt: j.completedAt?.toISOString() ?? null,
            resultPayload: j.resultPayload as Record<string, unknown> | null,
          }))}
          currentPage={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </>
  );
}

import { getSession } from "@/lib/auth/get-session";
import { getUserJobHistory } from "@/lib/db/scoped-queries";
import { JobHistoryTable } from "@/components/dashboard/job-history-table";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const status = params.status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | undefined;

  const result = await getUserJobHistory(session!.user.id, {
    page,
    limit: 20,
    status,
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Job History</h2>
      <JobHistoryTable
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
  );
}

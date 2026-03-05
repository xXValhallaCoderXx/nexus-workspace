import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { listTranscriptFiles } from "@/lib/google/fetch-transcript";
import { getJobStatusByFileIds } from "@/lib/db/scoped-queries";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listTranscriptFiles(session.user.id);
    const fileIds = files.map((f) => f.fileId);
    const jobs = await getJobStatusByFileIds(session.user.id, fileIds);

    // Build a map of fileId → most recent job (already ordered by createdAt desc)
    const jobMap = new Map<string, { status: string; id: string }>();
    for (const job of jobs) {
      if (!jobMap.has(job.sourceFileId)) {
        jobMap.set(job.sourceFileId, { status: job.status, id: job.id });
      }
    }

    const merged = files.map((f) => {
      const job = jobMap.get(f.fileId);
      return {
        ...f,
        jobStatus: job?.status ?? null,
        jobId: job?.id ?? null,
      };
    });

    return NextResponse.json({ files: merged });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (
      message.includes("No Google account") ||
      message.includes("invalid_grant") ||
      message.includes("refresh token")
    ) {
      return NextResponse.json(
        { error: "Google account not connected. Please reconnect your account." },
        { status: 400 }
      );
    }
    throw err;
  }
}

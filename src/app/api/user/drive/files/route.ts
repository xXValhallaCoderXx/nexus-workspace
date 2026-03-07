import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { listTranscriptFiles } from "@/lib/google/fetch-transcript";
import { getWorkflowRunStatusByFileIds } from "@/lib/db/scoped-queries";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listTranscriptFiles(session.user.id);
    const fileIds = files.map((f) => f.fileId);
    const runs = await getWorkflowRunStatusByFileIds(session.user.id, fileIds);

    // Build a map of fileId -> most recent run status
    const runMap = new Map<string, { status: string; id: string }>();
    for (const run of runs) {
      const inputRefs = run.inputRefJson as Record<string, unknown> | null;
      const fileId = inputRefs?.fileId as string | undefined;
      if (fileId && !runMap.has(fileId)) {
        runMap.set(fileId, { status: run.status, id: run.id });
      }
    }

    const merged = files.map((f) => {
      const run = runMap.get(f.fileId);
      return {
        ...f,
        jobStatus: run?.status ?? null,
        jobId: run?.id ?? null,
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

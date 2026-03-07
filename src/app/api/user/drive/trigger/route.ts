import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { enqueueTranscriptJob } from "@/lib/queue/enqueue";
import {
  createWorkflowRun,
  findPendingWorkflowRun,
} from "@/lib/db/scoped-queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fileId, fileName } = body as { fileId?: string; fileName?: string };

  if (!fileId || typeof fileId !== "string") {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  // Check for in-flight run
  const existing = await findPendingWorkflowRun(session.user.id, fileId);

  if (existing) {
    return NextResponse.json(
      { error: "A job is already in progress for this file" },
      { status: 409 }
    );
  }

  const run = await createWorkflowRun({
    userId: session.user.id,
    workflowType: "MEETING_SUMMARY",
    triggerType: "MANUAL",
    inputRefJson: { fileId, fileName },
    status: "PENDING",
  });

  await enqueueTranscriptJob({
    userId: session.user.id,
    fileId,
    fileName: fileName ?? undefined,
  });

  return NextResponse.json({ queued: true, runId: run.id });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { enqueueTranscriptJob } from "@/lib/queue/enqueue";
import { prisma } from "@/lib/db/prisma";

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

  // Check for in-flight job
  const existing = await prisma.jobHistory.findFirst({
    where: {
      userId: session.user.id,
      sourceFileId: fileId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A job is already in progress for this file" },
      { status: 409 }
    );
  }

  const job = await prisma.jobHistory.create({
    data: {
      userId: session.user.id,
      sourceFileId: fileId,
      sourceFileName: fileName ?? null,
      status: "PENDING",
    },
  });

  await enqueueTranscriptJob({
    userId: session.user.id,
    fileId,
    fileName: fileName ?? undefined,
  });

  return NextResponse.json({ queued: true, jobId: job.id });
}

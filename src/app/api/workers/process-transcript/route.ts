import { NextResponse } from "next/server";
import { requireQStashSignature } from "@/lib/queue/verify-qstash";
import { transcriptJobPayloadSchema } from "@/lib/queue/enqueue";
import { MeetingSummaryHandler } from "@/lib/workflows/meeting-summary";
import { deliverArtifact } from "@/lib/destinations/planner";
import {
  createWorkflowRun,
  updateWorkflowRun,
  findPendingWorkflowRun,
  createArtifact,
} from "@/lib/db/scoped-queries";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  let body: string;
  try {
    body = await requireQStashSignature(request);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = transcriptJobPayloadSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { userId, fileId, fileName, sourceEventId } = parsed.data;

  // Reuse a PENDING run (created by manual trigger) or create a new one
  const existingRun = await findPendingWorkflowRun(userId, fileId);

  const run = existingRun
    ? await updateWorkflowRun(existingRun.id, {
        status: "PROCESSING",
        startedAt: new Date(),
      }).then(() =>
        prisma.workflowRun.findUniqueOrThrow({ where: { id: existingRun.id } })
      )
    : await createWorkflowRun({
        userId,
        workflowType: "MEETING_SUMMARY",
        triggerType: sourceEventId ? "EVENT" : "MANUAL",
        sourceEventId,
        inputRefJson: { fileId, fileName },
        status: "PROCESSING",
        startedAt: new Date(),
      });

  try {
    const handler = new MeetingSummaryHandler();
    const output = await handler.execute({
      userId,
      workflowRunId: run.id,
      sourceEventId: sourceEventId ?? undefined,
      inputRefs: { fileId, fileName },
    });

    // Create Artifact
    const artifact = await createArtifact({
      userId,
      artifactType: output.artifactType,
      workflowRunId: run.id,
      title: output.title,
      summaryText: output.summaryText,
      payloadJson: output.payloadJson as Prisma.InputJsonValue,
      sourceRefsJson: output.sourceRefsJson as Prisma.InputJsonValue,
    });

    // Deliver to all enabled destinations
    const deliveredTo = await deliverArtifact(
      {
        id: artifact.id,
        artifactType: artifact.artifactType,
        title: artifact.title,
        summaryText: artifact.summaryText,
        payloadJson: artifact.payloadJson as Record<string, unknown> | null,
        sourceRefsJson: artifact.sourceRefsJson as Record<string, unknown> | null,
      },
      userId
    );

    // Mark run completed
    await updateWorkflowRun(run.id, {
      status: "COMPLETED",
      completedAt: new Date(),
      modelUsed: output.modelUsed,
      metricsJson: { destinations: deliveredTo },
    });

    return NextResponse.json({ success: true, runId: run.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await updateWorkflowRun(run.id, {
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date(),
    });

    throw error; // Re-throw so QStash retries
  }
}

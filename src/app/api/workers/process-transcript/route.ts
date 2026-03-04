import { NextResponse } from "next/server";
import { requireQStashSignature } from "@/lib/queue/verify-qstash";
import { transcriptJobPayloadSchema } from "@/lib/queue/enqueue";
import { processMeetingTranscript } from "@/lib/ai/process-meeting";
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

  const { userId, fileId, fileName } = parsed.data;

  const job = await prisma.jobHistory.create({
    data: {
      userId,
      sourceFileId: fileId,
      sourceFileName: fileName,
      status: "PROCESSING",
    },
  });

  try {
    const result = await processMeetingTranscript(userId, fileId);

    await prisma.jobHistory.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        resultPayload: result.payload,
        llmModel: result.model,
        destinationDelivered: result.destination,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.jobHistory.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    throw error; // Re-throw so QStash retries
  }
}

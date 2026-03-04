import { NextResponse } from "next/server";
import { requireQStashSignature } from "@/lib/queue/verify-qstash";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  let body: string;
  try {
    body = await requireQStashSignature(request);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  console.warn(
    JSON.stringify({
      level: "warn",
      event: "dead_letter_received",
      payload,
      timestamp: new Date().toISOString(),
    })
  );

  await prisma.failedJob.create({
    data: {
      userId: payload.userId ?? null,
      jobType: "MEETING_SUMMARY",
      payload,
      errorMessage: payload.error ?? "Exhausted all retries",
      attempts: 3,
    },
  });

  return NextResponse.json({ received: true });
}

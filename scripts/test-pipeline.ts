/**
 * Test script: Simulates the full processing pipeline with a fake transcript.
 * Bypasses Google Drive webhook + QStash — directly calls the AI processing engine.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { callOpenRouter } from "../src/lib/ai/openrouter-client";
import {
  MEETING_SUMMARY_SYSTEM_PROMPT,
  meetingSummarySchema,
} from "../src/lib/ai/prompts/meeting-summary";

const SAMPLE_TRANSCRIPT = `
GB V3 Sync — 2026/03/03 12:00 GMT+08:00

Attendees: Sunny Singh, Prakeerthi Turner, Renate Gouveia, stearn.yao@nexis.io

Summary:
The team discussed the Nexus Business Light version targeting "single player" users,
with Prakeerthi Turner presenting a "consumer friendly" design theme that
simplifies onboarding by letting the user set up their wallet by scanning a QR code,
email validation by offering payment receipts. Participants, including Renate Gouveia,
aligned on the meeting's objective to refine Prakeerthi Turner's UX workflows,
with Sunny Singh advising reorganising the Receiver workflow to be
connection-first and copying the "ecological" concept for the Mover feature. The main
talking points included the light version's flow, upselling strategy for the Pro version,
the need for a central transaction history with export functionality, and aligning
website updates for the launch scheduled for the week of the 18th.

Details:
- Nexus Business Light Version Overview: The team discussed the Nexus Business Light
  version, which is designed to be accessible without a sign-up or gate. Users can
  immediately start using the product by landing on the page and seeing "get started" only
  requiring to connect their wallet for transactions.

Action Items:
- Sunny Singh: Reorganise the Receiver workflow to be connection-first by March 10.
- Prakeerthi Turner: Update the light version wireframes based on feedback by March 7.
- Renate Gouveia: Review the upselling flow from Light to Pro and provide feedback by March 6.

Decisions:
- The light version will use the "consumer friendly" design approach (option 2).
- Transaction history will be centralised with export functionality.

Follow-ups:
- Renate will send the discussion summary regarding the new Tyke architecture.
- Schedule a follow-up to review updated wireframes on March 8.
`;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Find the first user in the database
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No users found in the database. Sign in via the app first.");
    process.exit(1);
  }
  console.log(`Using user: ${user.name} (${user.email})`);

  // Clean up any stale PROCESSING runs from previous test runs
  const stale = await prisma.workflowRun.deleteMany({
    where: {
      userId: user.id,
      workflowType: "MEETING_SUMMARY",
      inputRefJson: { path: ["fileId"], equals: "test-file-001" },
      status: "PROCESSING",
    },
  });
  if (stale.count > 0) {
    console.log(`Cleaned up ${stale.count} stale PROCESSING run(s) from previous runs`);
  }

  // Create a pending workflow run
  const run = await prisma.workflowRun.create({
    data: {
      userId: user.id,
      workflowType: "MEETING_SUMMARY",
      triggerType: "MANUAL",
      inputRefJson: { fileId: "test-file-001", fileName: "GB V3 Sync — Meeting Transcript" },
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });
  console.log(`Created workflow run: ${run.id}`);

  // Call OpenRouter directly with the sample transcript
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not set in .env");
    process.exit(1);
  }

  console.log("Calling OpenRouter...");
  const response = await callOpenRouter({
    apiKey,
    model: "google/gemini-2.0-flash-001",
    systemPrompt: MEETING_SUMMARY_SYSTEM_PROMPT,
    userContent: SAMPLE_TRANSCRIPT,
    responseFormat: "json_object",
  });

  console.log(`Model used: ${response.model}`);

  // Parse and validate the response
  let parsed;
  try {
    parsed = meetingSummarySchema.parse(JSON.parse(response.content));
  } catch (err) {
    console.error("Failed to parse LLM response:", response.content);
    throw err;
  }

  console.log("\n--- Meeting Summary ---");
  console.log(`Title: ${parsed.title}`);
  console.log(`Date: ${parsed.date ?? "N/A"}`);
  console.log(`Attendees: ${parsed.attendees.join(", ")}`);
  console.log(`\nSummary:\n${parsed.summary}`);
  console.log(`\nAction Items:`);
  for (const item of parsed.actionItems) {
    console.log(`  - ${item.owner}: ${item.task}${item.deadline ? ` (by ${item.deadline})` : ""}`);
  }
  console.log(`\nDecisions:`);
  for (const d of parsed.decisions) {
    console.log(`  - ${d}`);
  }
  console.log(`\nFollow-ups:`);
  for (const f of parsed.followUps) {
    console.log(`  - ${f}`);
  }

  // Create artifact and mark run completed
  await prisma.artifact.create({
    data: {
      userId: user.id,
      artifactType: "MEETING_SUMMARY",
      workflowRunId: run.id,
      title: parsed.title,
      summaryText: parsed.summary,
      payloadJson: parsed as object,
    },
  });

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETED",
      modelUsed: response.model,
      completedAt: new Date(),
    },
  });

  console.log(`\nRun ${run.id} marked as COMPLETED. Check /dashboard/history to view it.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

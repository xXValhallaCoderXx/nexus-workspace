/**
 * Test script: Seeds PendingNotification records and triggers the triage digest cron.
 * Simulates the full omnichannel pipeline without needing a real Slack connection.
 *
 * Usage:
 *   npx tsx scripts/test-triage-digest.ts
 *
 * Prerequisites:
 *   - At least one user signed in via the app
 *   - OPENROUTER_API_KEY set in .env
 *   - Dev server running (npm run dev) OR set CRON_URL to the live URL
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SAMPLE_MENTIONS = [
  {
    externalMessageId: "test-msg-001",
    authorName: "Sarah Chen",
    content:
      "@nexus Can you review the PR for the auth refactor? It's blocking the release.",
    metadata: {
      channel: "engineering",
      permalink: "https://slack.com/archives/C123/p1234567890",
      team: "T-test",
    },
  },
  {
    externalMessageId: "test-msg-002",
    authorName: "Mike Johnson",
    content:
      "@nexus FYI — deployed v2.3.1 to staging. Release notes in the thread.",
    metadata: {
      channel: "deployments",
      permalink: "https://slack.com/archives/C456/p1234567891",
      team: "T-test",
    },
  },
  {
    externalMessageId: "test-msg-003",
    authorName: "Alex Rivera",
    content:
      "@nexus The database migration failed on prod. Need someone to look at this ASAP!",
    metadata: {
      channel: "incidents",
      permalink: "https://slack.com/archives/C789/p1234567892",
      team: "T-test",
    },
  },
  {
    externalMessageId: "test-msg-004",
    authorName: "Bot: GitHub",
    content:
      "@nexus [CI] Build #4521 passed on main. All 247 tests green.",
    metadata: {
      channel: "ci-notifications",
      permalink: "https://slack.com/archives/C101/p1234567893",
      team: "T-test",
    },
  },
  {
    externalMessageId: "test-msg-005",
    authorName: "Jordan Lee",
    content:
      "@nexus Hey, are we still doing the team lunch on Friday? Let me know!",
    metadata: {
      channel: "random",
      permalink: "https://slack.com/archives/C202/p1234567894",
      team: "T-test",
    },
  },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // ── Step 1: Find a user ──
    const user = await prisma.user.findFirst({
      include: { config: true },
    });
    if (!user) {
      console.error(
        "❌ No users found. Sign in via the app first."
      );
      process.exit(1);
    }
    console.log(`👤 Using user: ${user.name} (${user.email})\n`);

    // ── Step 2: Enable quiet mode ──
    await prisma.userConfig.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        quietModeEnabled: true,
        digestSchedule: {
          times: ["12:00", "16:00"],
          timezone: "UTC",
        } satisfies Record<string, unknown> as unknown as Prisma.InputJsonValue,
      },
      update: {
        quietModeEnabled: true,
      },
    });
    console.log("✅ Quiet mode enabled for user\n");

    // ── Step 3: Clean up old test notifications ──
    const cleaned = await prisma.pendingNotification.deleteMany({
      where: {
        userId: user.id,
        connectorId: "slack",
        externalMessageId: { startsWith: "test-msg-" },
      },
    });
    if (cleaned.count > 0) {
      console.log(
        `🧹 Cleaned ${cleaned.count} old test notification(s)\n`
      );
    }

    // ── Step 4: Seed PendingNotification records ──
    for (const mention of SAMPLE_MENTIONS) {
      await prisma.pendingNotification.create({
        data: {
          userId: user.id,
          connectorId: "slack",
          ...mention,
          metadata:
            mention.metadata as unknown as Prisma.InputJsonValue,
        },
      });
      console.log(`  📨 Seeded: "${mention.authorName}" in #${(mention.metadata as Record<string, string>).channel}`);
    }
    console.log(`\n✅ Seeded ${SAMPLE_MENTIONS.length} pending notifications\n`);

    // ── Step 5: Verify they're in the database ──
    const count = await prisma.pendingNotification.count({
      where: { userId: user.id },
    });
    console.log(`📊 Total pending notifications for user: ${count}\n`);

    // ── Step 6: Trigger the digest cron ──
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("❌ CRON_SECRET not set. Cannot trigger digest.");
      console.log(
        "\n📋 Manual alternative: open Prisma Studio to see the seeded data:"
      );
      console.log("   npx prisma studio\n");
      process.exit(1);
    }

    const baseUrl =
      process.env.NEXTAUTH_URL || "http://localhost:3000";
    const cronUrl = `${baseUrl}/api/cron/process-triage-digest`;

    console.log(`🚀 Triggering digest cron at: ${cronUrl}\n`);

    const response = await fetch(cronUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ Cron failed (${response.status}):`, result);
      process.exit(1);
    }

    console.log("✅ Digest cron response:", JSON.stringify(result, null, 2));

    // ── Step 7: Verify results ──
    const remaining = await prisma.pendingNotification.count({
      where: { userId: user.id },
    });
    console.log(`\n📊 Remaining pending notifications: ${remaining}`);

    const digestRun = await prisma.workflowRun.findFirst({
      where: {
        userId: user.id,
        workflowType: "SCHEDULED_DIGEST",
      },
      orderBy: { createdAt: "desc" },
      include: {
        artifacts: {
          include: { deliveries: true },
        },
      },
    });

    if (digestRun) {
      console.log(`\n📋 Digest workflow run:`);
      console.log(`   Status: ${digestRun.status}`);
      console.log(`   Model: ${digestRun.modelUsed}`);
      console.log(
        `   Metrics: ${JSON.stringify(digestRun.metricsJson)}`
      );

      if (digestRun.artifacts[0]) {
        const artifact = digestRun.artifacts[0];
        console.log(`\n📄 Artifact: "${artifact.title}"`);
        console.log(
          `   Deliveries: ${artifact.deliveries.length}`
        );
        for (const d of artifact.deliveries) {
          console.log(
            `   → ${d.provider}: ${d.status}${d.externalUrl ? ` (${d.externalUrl})` : ""}`
          );
        }
      }
    }

    console.log("\n🎉 Done! Check the following places in the UI:");
    console.log("   1. Dashboard → History — look for the digest run");
    console.log("   2. Click on the digest row to see classified messages");
    console.log(
      "   3. Settings → Workflows — Quiet Mode toggle should be ON"
    );
    if (result.succeeded > 0) {
      console.log("   4. Check your Slack DMs for the digest (if Slack is connected)");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

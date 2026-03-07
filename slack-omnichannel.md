
# PRD: Nexus "Quiet Mode" (Omnichannel Triage Digest)

**Status:** Draft — Pending User Research

**Product:** Nexus

**Feature:** Omnichannel "Quiet Mode" (Batch & Triage Digest)

**Objective:** Eliminate context-switching by aggregating notifications from multiple chat platforms, categorizing them by urgency, and delivering them in scheduled batches.

## 1. Problem Statement

**The "Why":** Knowledge workers (Engineers, PMs, Founders) have their deep work constantly interrupted by chat pings.
**The Pain:** As teams span across Slack, Microsoft Teams, and Discord, the fragmentation multiplies the noise. Not all mentions are equal: a blocking question requires immediate attention, but a PR review or a broad FYI does not. Because native notifications are binary (you either get pinged or you turn them off and become a bottleneck), users suffer extreme context switching.
**The Current Workaround:** Users manually scan notifications across 3 different apps, mentally categorize them, and use "Save for Later" features, which inevitably turn into a graveyard of forgotten tasks.

## 2. Target Audience & Value Proposition

* **Who:** Existing Nexus users who experience high message volume across one or more platforms.
* **Value Prop:** "Never miss a critical question, but never get interrupted by a non-critical one again. All your platforms, triaged in one digest."

## 3. The Solution (POC Scope)

Nexus acts as an omnichannel buffer. It intercepts `@` mentions from connected platforms (starting with Slack), holds them in a unified queue, and uses a fast/cheap LLM to categorize them. It then delivers a structured Markdown digest at user-defined intervals.

### 3.1. In Scope (The MVP)

* **Bidirectional Connector Framework:** Evolve the existing Nexus Connector architecture to support inbound webhooks (Sources), starting with Slack.
* **Unified Database Queue:** Store raw messages in an agnostic `PendingNotification` table.
* **Scheduled Cron (QStash):** A worker that runs at set intervals (e.g., 12 PM, 4 PM) to pull pending messages for each user.
* **LLM Classification (OpenRouter):** Send the batch of messages to a low-cost model (e.g., Llama 3 8B, Claude 3 Haiku) to categorize into three buckets: `ACTION_REQUIRED`, `READ_ONLY`, and `NOISE`.
* **Digest Delivery:** Send a formatted digest to the user's primary Nexus output destination (e.g., a Slack DM) with permalinks back to the original source platforms.

### 3.2. Out of Scope (Phase 2)

* *Auto-task extraction to ClickUp* (Requires higher-tier models).
* *Smart Pager / Real-time Urgency Overrides* (Too risky for a V1; requires absolute trust).
* *Contextual Auto-Drafting* (Searching meeting history to draft replies).

---

## 4. Technical Strategy & Architecture (Connector V2)

To support the vision of aggregation without hardcoding platform-specific logic into the core application, we will evolve the `src/lib/connectors/types.ts` interface.

### 4.1. Data Model Update

Add a canonical entity to the Prisma schema (`prisma/schema.prisma`):

```prisma
model PendingNotification {
  id                 String   @id @default(cuid())
  userId             String
  connectorId        String   // e.g., "slack", "teams"
  externalMessageId  String   // Used for deduplication
  authorName         String
  content            String   // The raw message text
  metadata           Json?    // Stores platform-specific routing data (e.g., channel ID, permalink)
  createdAt          DateTime @default(now())
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, connectorId, externalMessageId])
}

```

### 4.2. Evolving the Connector Interface

Extend the `Connector` interface in `src/lib/connectors/types.ts` to support inbound data:

* **Current:** `deliver(payload, config)`
* **New Additions:** `parseWebhook(request, userConfig): PendingNotification` and `verifyWebhookSignature(request)`

### 4.3. Universal Ingestion Pipeline

Instead of a Slack-specific webhook route, we create a dynamic route: `/api/webhooks/connectors/[connectorId]/route.ts`.

1. The endpoint identifies the connector via the URL.
2. It fetches the connector from `getConnectorProvider(connectorId)`.
3. It calls `verifyWebhookSignature()` followed by `parseWebhook()`.
4. It saves the resulting canonical object to the `PendingNotification` table.

### 4.4. The AI Triage Pipeline (Low-Cost Execution)

Create `/api/cron/process-triage-digest` triggered by Upstash QStash.

1. **Group:** Pull all `PendingNotification` records grouped by `userId`.
2. **Prompt:** Send the array of generic message objects to `openrouter-client.ts` using a strict Zod schema for the output array. The system prompt handles the classification logic independent of the source platform.
3. **Format & Deliver:** Pass the structured JSON to a new formatting utility (`triage-formatter.ts`), and push the digest via the user's configured output connector (using your existing `deliverToAllDestinations()` router).
4. **Cleanup:** Delete processed records from `PendingNotification`.

---

## 5. User Research Script (To Validate Before Building)

Because this feature requires a massive behavioural shift (muting native notifications), you must validate the "Trust Gap" assumption.

**Ask your target users these 3 questions:**

1. *"If you muted all Slack/Teams notifications right now and only checked them at 12 PM and 4 PM, what is the exact scenario that would get you fired or cause a major business failure?"*
**(Why we ask:** This defines the "Smart Pager" urgency threshold we need to handle eventually, and reveals their baseline anxiety.)
2. *"Show me the last 5 @mentions you received today. Without overthinking it, how would you categorize them: Needs Action, Read Later, or Pure Noise?"*
**(Why we ask:** Validates if our 3 AI buckets actually map to reality, and gives you real data to test your prompt against.)
3. *"If an AI categorized your messages perfectly but delivered them to you via an email digest instead of inside Slack, would you read it?"*
**(Why we ask:** Tests the delivery mechanism. If they say no, it means we *must* deliver the digest directly back into their primary chat tool, not just the Nexus web dashboard.)


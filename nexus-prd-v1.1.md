# Project Nexus
## Internal AI Automation Platform — Product Requirements Document

**Version:** 1.1 (Revised post security & architecture review)
**Status:** POC / Phase 1
**Date:** March 2026
**Classification:** Confidential — Internal Use Only

> **What changed in v1.1:** This revision incorporates a security and architecture review. Key additions include webhook signature verification, API key encryption at rest, Google Drive push notification channel renewal (channels expire ~7 days), Redis deduplication, dead-letter queue strategy, and OAuth scope clarification. The core architecture is unchanged — these are hardening and operational reliability additions.

---

## 1. Executive Summary

Nexus is a serverless, extensible internal tooling platform designed to automate routine organisational workflows using Large Language Models (LLMs). Rather than building rigid, single-purpose scripts, Nexus uses a decoupled, event-driven architecture.

The Minimum Viable Product (MVP) focuses on automating Meeting Transcript Summaries. The system is explicitly architected to allow rapid deployment of future workflows (e.g., email summarisation, PR reviews, ticket generation) without rewriting the core execution engine.

| Field | Detail |
|---|---|
| Stakeholders | Engineering Team, CTO (Sunny), internal operational users |
| Phase | Phase 1 — POC / MVP |
| Last Revised | March 2026 (v1.1 — post security review) |
| Deployment Target | Vercel (serverless) |

---

## 2. Core Architectural Methodology

To ensure long-term viability and prevent technical debt, the application strictly separates concerns into three distinct layers. Adding a new feature in the future should require only a new module — not a rewrite of the core engine.

### Layer 1 — Ingestion (Triggers)

Dedicated API routes that receive incoming webhooks (Google Drive, Gmail, GitHub, etc.). Each route immediately validates the request signature, acknowledges the webhook to prevent timeouts, performs a deduplication check, and enqueues the payload to the background worker queue.

### Layer 2 — Processing (The AI Engine)

An asynchronous worker that retrieves the user's specific API keys (or defaults to the global OpenRouter key), applies a workflow-specific prompt template, and executes the LLM call via OpenRouter. Workers are invoked by the task queue — never directly by the webhook route — ensuring serverless timeout limits are never breached.

### Layer 3 — Destination (Strategy Pattern)

A modular routing system. Processed output is passed to an abstract `DestinationProvider`. Whether the payload goes to Slack, ClickUp, Linear, or an internal database, the core engine does not care — it simply executes the `.deliver()` method of the activated integration.

---

## 3. Phase 1 (MVP) Scope: Google Meet Summariser

The initial proof-of-concept validates the architecture by solving a high-visibility pain point: actionable meeting summaries delivered automatically after every Google Meet.

### 3.1 User Flow

1. **Onboarding:** User logs into the UI via Google OAuth and grants read-only access to Google Drive (scope: `https://www.googleapis.com/auth/drive.readonly`).
2. **Channel Registration:** On successful OAuth, the backend calls the Google Drive `Files.watch` API to register a push notification channel for the user's Drive. The channel expiry timestamp is persisted to the database.
3. **Configuration:** User optionally inputs their own OpenRouter API key (stored encrypted). They toggle "Meeting Summaries" to ON and select a destination (e.g., Slack or Linear).
4. **Execution:** User finishes a Google Meet → Google Drive generates a transcript and triggers the Nexus webhook → Nexus verifies the request signature and deduplicates → enqueues the job → the async worker fetches the document, calls OpenRouter, extracts action items and decisions → formatted summary is delivered to the user's configured destination.
5. **Channel Renewal:** A background scheduled job (Vercel Cron) checks for channels expiring within 24 hours and renews them automatically. Without renewal, push notifications silently stop after approximately 7 days.

---

## 4. Technical Specifications

### 4.1 Stack Overview

| Component | Technology | Notes |
|---|---|---|
| Frontend / Backend | Next.js (App Router) | Deployed on Vercel (serverless) |
| Database | PostgreSQL via Prisma ORM | Stores users, configs, channel expiry, job history |
| Authentication | NextAuth.js / Auth.js | Google OAuth — explicit Drive scope required |
| Task Queue | Upstash QStash or Inngest | Durable async jobs with retry + dead-letter support |
| Deduplication | Upstash Redis (SETNX) | Prevents duplicate processing of repeated webhooks |
| AI Aggregator | OpenRouter API | BYOK support; default global key for POC |
| Cron / Scheduling | Vercel Cron Jobs | Webhook channel renewal + queue health checks |

### 4.2 Async Pipeline — Request Flow

| # | Step | Component | Detail |
|---|---|---|---|
| 1 | Receive webhook | `/api/webhooks/google-drive` | Verify Google push notification signature (`X-Goog-Channel-Token`). Reject unsigned requests with 401. |
| 2 | Deduplication check | Upstash Redis | `SETNX` on `{resourceId}:{changeToken}` with 5-minute TTL. If key exists, return 200 and drop. Prevents duplicate LLM calls. |
| 3 | Enqueue job | QStash / Inngest | Push payload to durable queue. Return 200 immediately. Queue handles retries and backoff independently. |
| 4 | Process job | Async Worker | Fetch document from Drive using stored OAuth token. Truncate if needed. Apply meeting summary prompt. |
| 5 | LLM call | OpenRouter API | Use user's BYOK key if set, else global key. Request structured JSON output (action items, decisions, attendees). |
| 6 | Deliver | DestinationProvider | Route output to user's configured destination (Slack, Linear, DB). Log result to `job_history` table. |

---

## 5. Security Requirements

> All items in this section are required before any real user data flows through the system. They are pre-conditions for the POC going live, not post-MVP polish.

### 🔴 REQUIRED — Webhook Signature Verification

Every inbound request to `/api/webhooks/google-drive` must be authenticated using the `X-Goog-Channel-Token` validated against the stored token for that channel. Requests that fail this check must return `401` and never be enqueued. This prevents queue flooding and LLM budget exhaustion from unauthenticated actors.

### 🔴 REQUIRED — API Key Encryption at Rest

User-supplied OpenRouter API keys must be encrypted before writing to the database. Use AES-256 symmetric encryption via Node.js built-in `crypto` module. The encryption secret lives in a server-side environment variable — never committed to source control. The plaintext key must only exist in memory during the LLM call.

### 🟡 REQUIRED — Multi-Tenant Data Isolation

Every Prisma query that accesses user-scoped data (configs, API keys, destinations, job history) must include a `WHERE userId = session.user.id` clause. Missing this clause on any query leaks data between users. Add an integration test or middleware assertion layer to enforce this as a hard constraint.

### 🔵 NOTE — OAuth Scope Configuration

The NextAuth Google provider must explicitly request the Drive read scope. Default configs only request `profile` and `email`. Add `https://www.googleapis.com/auth/drive.readonly` to the provider's scope configuration. Failure to set this will cause channel registration to silently fail.

---

## 6. Operational Reliability

### 6.1 Google Drive Push Notification Channel Renewal

> **⚠️ Critical:** Google Drive push notification channels have a maximum TTL of approximately 7 days. If a channel is not renewed before expiry, it silently stops delivering webhooks — meaning transcripts will be missed without any visible error. This is the single most important operational concern for Phase 1.

Implementation requirements:

- **Store expiry on registration:** When the `drive.files.watch` API call is made, persist the returned `expiration` timestamp to a `push_channels` table in Postgres alongside the `channelId`, `resourceId`, `userId`, and `watchToken`.
- **Scheduled renewal job:** A Vercel Cron job runs every 6 hours. It queries for all channels where `expiration < NOW() + 24 hours`, calls `drive.files.watch` to register a new channel, stores the new expiry, and deletes the old record.
- **Failure alerting:** If renewal fails (e.g., user's OAuth token expired), the user must be notified to reconnect their Google account. Log to a `channel_renewal_errors` table and surface in the UI.
- **Overlap window:** Renew channels at least 24 hours before expiry — not at the last moment — to account for cron delays and API failures.

### 6.2 Dead-Letter Queue & Retry Strategy

The task queue (QStash or Inngest) must be configured with the following failure behaviour to meet the 99%+ delivery success metric:

- **Automatic retries:** Configure `maxRetries: 3` with exponential backoff on all job types.
- **Dead-letter handling:** Jobs that exhaust retries must trigger a failure callback that writes to a `failed_jobs` table with the full payload, error message, and timestamp for manual review.
- **Observability:** Use Inngest's built-in dashboard or QStash's metrics endpoint to monitor queue health. Set up alerts for any spike in failure rate.

### 6.3 Redis Deduplication — Architecture Note

Google Drive push notifications use at-least-once delivery. A single transcript upload can trigger 2–5 webhook pings (`file.create` followed by sync events). Without deduplication, the same transcript will be processed multiple times, creating duplicate summaries and wasting LLM budget.

Redis deduplication sits in front of the task queue — it is not a replacement for it. The two components serve distinct purposes:

| Component | Role | Cost at POC Scale |
|---|---|---|
| Upstash Redis | Deduplication layer — `SETNX` check on each webhook | Free up to 10k commands/day |
| Upstash QStash | Durable task queue — retries, backoff, dead-letter | Free up to 500 messages/day |
| Inngest (alt.) | Task queue with richer observability dashboard | Free up to 50k runs/month |

> **Recommendation:** Upstash Redis + QStash for the POC. Both are serverless-native, Vercel-compatible, and have zero infrastructure to manage. Swap QStash for Inngest if richer job observability is needed.

---

## 7. Extensibility & Future-Proofing (Phase 2+)

The platform is designed to scale across three vectors without modifying the core execution engine.

### Vector 1 — Bring Your Own Key / Model (BYOK/BYOM)

- **Phase 1:** Global OpenRouter key, fixed model for stability.
- **Phase 2:** Users define `preferredModel` in settings. The platform dynamically routes to Claude 3.5 Sonnet, GPT-4o, Gemini, or any other OpenRouter-supported model based on user preference and task complexity.

### Vector 2 — New Integrations

- **Phase 1:** Slack DM delivery and basic database storage.
- **Phase 2:** Adding Linear requires only a `LinearProvider.ts` class that maps the LLM JSON output to Linear's GraphQL API. The Google Drive ingestion and AI worker are untouched.

### Vector 3 — New Workflows

- **Phase 1:** Google Drive `file.created` webhook → meeting summary.
- **Phase 2:** Inbound email processor — spin up `/api/webhooks/gmail`, write a prompt template, route through the same async worker and destination modules. No architectural changes required.

---

## 8. Success Metrics for the POC

| Metric | Target | Measurement Method |
|---|---|---|
| Adoption Rate | ≥ 50% of eng/product team connects Google account within 14 days | Database: count of connected OAuth users |
| Execution Success | ≥ 99% webhook-to-destination delivery | `failed_jobs` table + queue metrics dashboard |
| Channel Renewal | Zero missed transcripts due to expired channels | `channel_renewal_errors` table — target 0 entries |
| Duplicate Rate | < 1% duplicate summaries delivered | Redis dedup hit rate via Upstash metrics |
| Time Saved | Positive qualitative feedback from ≥ 3 users within 14 days | Async Slack survey after first summary received |

---

## 9. Local Development Notes

> **Heads up:** Google cannot deliver push notifications to `localhost`. All webhook development requires a public HTTPS endpoint from day one.

- **Tunnel setup:** Add `ngrok` or Cloudflare Tunnel to the project README as a day-one dev dependency. Use `ngrok http 3000` and register the tunnel URL as the push notification endpoint.
- **Staging environment:** Use a shared Vercel Preview deployment URL for team testing against real Google Drive events before production.
- **Webhook channel TTL in dev:** Register test channels with a short TTL (1 hour) during development so renewal logic can be tested without waiting 7 days.

---

## Document Control

| Version | Changes |
|---|---|
| v1.0 | Original PRD |
| v1.1 | Revised post security & architecture review: added webhook signature verification, API key encryption, channel renewal mechanism (Section 6.1), Redis deduplication, dead-letter queue strategy, OAuth scope clarification, and multi-tenant isolation requirements. |

# Nexus — Project Overview

> **Start here.** This is the main entry point for understanding the Nexus codebase.
> Detailed references are split into focused documents in this directory.

## What It Is

Nexus is a **Meeting Intelligence** app that automatically captures Google Meet transcripts from Google Drive, processes them with AI (via OpenRouter), and delivers structured summaries to multiple configurable destinations. It also includes an **Omnichannel Triage Digest** pipeline that batches Slack @mentions into AI-classified digests, a dedicated **Mentions** workspace for browsing triaged Slack activity, plus a guided **first-run onboarding flow** for login, workspace connections, and workflow setup.

## Related Docs

- [Data Models](./data-models.md) — Prisma schema, all models and enums
- [Directory Structure](./directory-structure.md) — File/folder layout with descriptions
- [Destinations](./destinations.md) — Destination architecture, providers, delivery planner
- [Omnichannel Triage](./omnichannel-triage.md) — Slack Quiet Mode, triage digest pipeline, manual sync

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 — custom design system with CSS variables (no component library)
- **Database**: PostgreSQL via Prisma 7 (client generated to `src/generated/prisma/`)
- **Auth**: NextAuth v4 with Prisma adapter, Google OAuth provider
- **Queue**: Upstash QStash for async job processing
- **Cache**: Upstash Redis for deduplication
- **AI**: OpenRouter API (user-provided API key or global fallback, AES-encrypted at rest)
- **Testing**: Vitest 4 + Testing Library (tests in `src/tests/`)
- **Build/Deploy**: Vercel (`vercel.json` present)

## Architecture & Data Flow

### Meeting Summary Pipeline

1. User signs in with Google → NextAuth stores OAuth tokens (including Drive access)
2. Brand-new users are routed through `/onboarding/connect` → `/onboarding/configure` once, using `UserConfig.onboardingStep` and `UserConfig.onboardingCompletedAt`
3. A **Google Drive Push Channel** (`PushChannel` model) watches for new transcript files
4. New transcript → webhook at `/api/webhooks/google-drive` → creates `SourceEvent` + `SourceItem` → enqueues job via QStash
5. Worker at `/api/workers/process-transcript` creates `WorkflowRun`, runs `MeetingSummaryHandler`, creates `Artifact`, delivers via planner
6. Run lifecycle: PENDING → PROCESSING → COMPLETED/FAILED
7. `Artifact.payloadJson` contains structured summary: title, date, attendees, summary text, action items, decisions, follow-ups
8. Delivery is **additive**: Nexus History always records the artifact; Slack DM and ClickUp Docs are independent toggles

### Omnichannel Triage Pipeline

See [Omnichannel Triage](./omnichannel-triage.md) for the full pipeline. Summary:

1. User enables **Quiet Mode** in Settings → Slack @mentions are batched instead of real-time
2. **Push path**: Slack Events API webhook at `/api/webhooks/connectors/slack` ingests `app_mention` events → stores `PendingNotification` records
3. **Pull path**: "Sync Now" button triggers `/api/user/triage/trigger` → uses Slack `search.messages` API to fetch recent @mentions → stores + processes
4. Processing: LLM classifies messages as ACTION_REQUIRED / READ_ONLY / NOISE → formats digest → delivers to all enabled destinations
5. Processed `PendingNotification` rows are deleted after digestion; per-message category/reason data remains in triage digest artifact payloads, which power the `/dashboard/mentions` workspace

## OAuth & Redirect URL Handling

- **Per-provider redirect base URLs**: Constructed via `buildOAuthRedirectUri(provider, path)` in `src/lib/auth/oauth-helpers.ts`
- **Lookup order**: `{PROVIDER}_REDIRECT_BASE_URL` env var → `NEXTAUTH_URL` (default). Providers requiring HTTPS (Slack) can use ngrok tunnel in dev.
- **HMAC-signed state tokens**: OAuth CSRF protection uses `createOAuthState(userId)` / `verifyOAuthState(state)` instead of cookies. Necessary because cookies set on localhost aren't sent through ngrok (different domain).
- **Slack OAuth**: Uses OAuth V2 flow (`oauth/v2/authorize`) with `user_scope=search:read`. Stores encrypted user access token in `DestinationConnection.oauthTokensEncrypted` for `search.messages` API. Bot token (`SLACK_BOT_TOKEN` env) used separately for sending DMs.
- **ClickUp OAuth**: Standard OAuth2 flow. Stores encrypted access/refresh tokens.
- **OAuth return routing**: Slack and ClickUp OAuth routes support a signed `returnTo` path inside the OAuth state token so onboarding can round-trip to `/onboarding/connect` instead of always bouncing through Settings.

## External API Data Controls

All external API calls have payload and rate limit controls:

| API | Rate Limit | Retry | Payload Limits |
|-----|-----------|-------|----------------|
| **OpenRouter** | 429 detection | 3 retries, exponential backoff | Messages truncated to 1K chars, batch capped at 50, total payload ≤30K chars, response `max_tokens: 2048` |
| **Slack** | `ratelimited` error | 2 attempts | Slack's own block limits apply |
| **ClickUp** | — | — | Markdown content from formatter |
| **Slack search.messages** | Standard Slack limits | — | Query limited to last 24h, 100 results |

Implemented in:
- `src/lib/ai/openrouter-client.ts` — Retry with backoff on 429/502/503, `maxTokens` support
- `src/lib/ai/prompts/triage-classification.ts` — `MAX_MESSAGE_CHARS` (1,000), `MAX_PAYLOAD_CHARS` (30,000), `MAX_MESSAGES_PER_BATCH` (50)

## Environment Variables

### Required

- `DATABASE_URL` — PostgreSQL connection string (Supabase pooler, session mode port 5432)
- `NEXTAUTH_SECRET` — NextAuth encryption secret
- `NEXTAUTH_URL` — App base URL (localhost in dev, real domain in prod)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` — Upstash QStash
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis
- `ENCRYPTION_SECRET` — AES key (32 bytes / 64 hex chars) for encrypting stored secrets
- `WEBHOOK_BASE_URL` — Externally-reachable URL for Google Drive webhooks and QStash callbacks (ngrok in dev)

### Optional

- `OPENROUTER_API_KEY` — Global fallback OpenRouter key (users can provide their own via BYOK)
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` — Slack OAuth app credentials
- `SLACK_BOT_TOKEN` — Slack bot token for sending DMs
- `SLACK_SIGNING_SECRET` — Slack app signing secret for webhook signature verification
- `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET` — ClickUp OAuth app credentials
- `CRON_SECRET` — Vercel cron authentication
- `{PROVIDER}_REDIRECT_BASE_URL` — Per-provider OAuth redirect override (e.g. `SLACK_REDIRECT_BASE_URL`)

## Database Setup

- **Full reset (dev)**: `npx prisma db push --force-reset` — drops all tables and recreates from schema
- **Apply schema changes**: `npx prisma db push` — applies schema diff without migration history
- **Generate client**: `npx prisma generate` — regenerates client to `src/generated/prisma/`
- **Prisma config**: `prisma.config.ts` loads `.env.local` then `.env` via dotenv
- **Connection**: Supabase session-mode pooler (`aws-*.pooler.supabase.com:5432`)

## Important Conventions

- All database queries in `src/lib/db/scoped-queries.ts` are **user-scoped** (userId in WHERE clause)
- API routes check `getSession()` and return 401 if unauthenticated; cron routes check `Bearer ${CRON_SECRET}`
- Encrypted fields use AES-256-GCM via `src/lib/crypto/encryption.ts`
- Generated Prisma client at `src/generated/prisma/` — import types from `@/generated/prisma/client`, enums from `@/generated/prisma/enums`
- Zod v4: import as `import { z } from "zod/v4"` — NOT `from "zod"`
- Prisma JSON null handling: use `Prisma.JsonNull` instead of raw `null` for JSON columns in upserts
- Schema changes use `prisma db push` (no migration history) — not `prisma migrate`
- CSS variables defined in `globals.css`: `--bg`, `--surface`, `--surface2`, `--border`, `--brand`, `--text`, `--muted`, `--green`, `--red`, etc. Tailwind uses `--color-*` aliases.
- No external UI component library — all components are hand-built with Tailwind

## UX Patterns

- **Meeting/digest viewing**: Clicking any "Ready" workflow item opens `NoteDetailModal` as a right-side detail panel via `?note=<runId>`
- **Mentions workspace**: `/dashboard/mentions` lists recent triaged Slack messages from digest artifacts, supports client-side search/category filtering, and opens `MentionDetailPanel` via `?mention=<messageId>`
- **Onboarding**: New users see a one-time onboarding flow after Google sign-in. They can skip from either step, and skip marks onboarding complete so future visits land directly on the dashboard.
- **Delivery retry**: Failed deliveries have per-destination retry buttons in the modal
- **Title cleanup**: Raw Google Drive filenames cleaned via `cleanMeetingTitle()` before display
- **Connector nudge card**: Promotional card on dashboard after 3+ meetings when ClickUp not connected
- **Filtering**: Meetings uses server-side filtering (URL params); Notes and Mentions use client-side filtering
- **Workspace navigation**: Sidebar routes are Dashboard, Notes, Meetings, Mentions, and Settings, with badges for processing workflow runs and queued mentions
- **Status badges**: Consistent `StatusBadge` component: ready/processing/pending/failed/connected/active/expired

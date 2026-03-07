# Nexus — Project Overview

## What It Is
Nexus is a **Meeting Intelligence** app that automatically captures Google Meet transcripts from Google Drive, processes them with AI (via OpenRouter), and delivers structured summaries to multiple configurable destinations. Nexus History (database) is always active; Slack DM and ClickUp are independent, additive output toggles.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 — custom design system with CSS variables (no component library)
- **Database**: PostgreSQL via Prisma 7 (client generated to `src/generated/prisma/`)
- **Auth**: NextAuth v4 with Prisma adapter, Google OAuth provider
- **Queue**: Upstash QStash for async job processing
- **Cache**: Upstash Redis for deduplication
- **AI**: OpenRouter API (user-provided API key, AES-encrypted at rest)
- **Testing**: Vitest 4 + Testing Library (tests in `src/tests/`)
- **Build/Deploy**: Vercel (`vercel.json` present)

## Architecture & Data Flow
1. User signs in with Google → NextAuth stores OAuth tokens (including Drive access)
2. A **Google Drive Push Channel** (`PushChannel` model) watches for new transcript files
3. When a new transcript appears → webhook at `/api/webhooks/google-drive` fires → creates `SourceEvent` + `SourceItem` records → enqueues job via QStash
4. Worker at `/api/workers/process-transcript` creates/reuses a `WorkflowRun`, runs the `MeetingSummaryHandler`, creates an `Artifact`, then delivers via the planner
5. Run lifecycle tracked in `WorkflowRun` model: PENDING → PROCESSING → COMPLETED/FAILED
6. `Artifact.payloadJson` (JSON) contains structured summary: title, date, attendees, summary text, action items, decisions, follow-ups
7. Delivery is **additive**: Nexus History always records the artifact; additional destinations (Slack DM, ClickUp Docs) are independently enabled per user via `DestinationConnection`
8. The delivery planner (`src/lib/destinations/planner.ts`) fans out to all enabled destinations, writing an `ArtifactDelivery` entry per destination per artifact
9. Users can also manually trigger processing from the Notes page, or retry failed runs/deliveries from History/Notes

## Key Data Models (Prisma)
- **User** — NextAuth user with accounts, sessions
- **UserConfig** — per-user settings: `meetingSummariesEnabled` (auto-process toggle), `quietModeEnabled` (omnichannel triage toggle), `digestSchedule` (JSON with delivery times/timezone), `dismissedConnectorNudge`, encrypted OpenRouter API key, custom system prompt
- **PushChannel** — Google Drive watch channel (channelId, resourceId, expiration)
- **SourceConnection** — per-user source integration: provider (GOOGLE_DRIVE), status, configJson (stores drivePageToken), externalAccountId. Unique on (userId, provider).
- **SourceEvent** — inbound webhook events: sourceConnectionId, eventType, dedupeKey, rawPayload, status (RECEIVED/PROCESSING/PROCESSED/FAILED)
- **SourceItem** — individual items from a source: externalItemId (e.g. Drive file ID), title, sourceUrl. Unique on (sourceConnectionId, externalItemId).
- **PendingNotification** — omnichannel triage queue: connectorId, externalMessageId, authorName, content, metadata (JSON). Unique on (userId, connectorId, externalMessageId). Processed and deleted by triage digest cron.
- **DestinationConnection** — per-user destination integration: provider (NEXUS_HISTORY/SLACK/CLICKUP), status, enabled, configJson, encrypted oauthTokens, externalAccountId (e.g. Slack user ID). Unique on (userId, provider).
- **WorkflowRun** — processing run: workflowType (MEETING_SUMMARY), triggerType, status (PENDING/PROCESSING/COMPLETED/FAILED), inputRefJson, modelUsed, errorMessage, metricsJson
- **Artifact** — output of a workflow run: artifactType (MEETING_SUMMARY), title, summaryText, payloadJson, sourceRefsJson
- **ArtifactDelivery** — per-destination delivery tracking: artifactId, provider, destinationConnectionId, status (PENDING/DELIVERED/FAILED), externalUrl, errorMessage, retryCount
- **FailedJob** — dead letter queue for failed async jobs
- **ChannelRenewalError** — tracks push channel renewal failures with `acknowledged` flag for alert dismissal

## Directory Structure

### `src/app/` — Next.js App Router pages & API routes
- `page.tsx` — Root home/login page: redirects authenticated users to `/dashboard`, shows SignInButton otherwise
- `layout.tsx` — Root layout: wraps app in SessionProvider, loads Inter font, sets metadata
- `dashboard/layout.tsx` — Dashboard shell: Sidebar + scrollable content area, shows processing count badge
- `dashboard/page.tsx` — Main dashboard: KPI cards, RecentMeetingsPanel, ConnectionsPanel, WorkflowsPanel, ConnectorNudgeCard
- `dashboard/notes/page.tsx` — Dedicated page for browsing Google Drive transcripts (DriveFilesPanel)
- `dashboard/history/page.tsx` — Paginated workflow run history with filters
- `dashboard/settings/page.tsx` — User settings (connections, destinations, workflows, API key, model context)
- `dashboard/settings/clickup-config-modal.tsx` — ClickUp configuration modal (workspace → space → folder → save)
- `dashboard/settings/settings-connections.tsx` — Manage Google/Slack/ClickUp connections + re-register push channel
- `dashboard/settings/settings-destination.tsx` — Toggle output destinations (Slack DM, ClickUp, Nexus History)
- `dashboard/settings/settings-workflows.tsx` — Toggle auto-summarization & Slack/ClickUp notifications
- `dashboard/settings/settings-api-key.tsx` — Manage OpenRouter API key (optional BYOK for LLM processing)
- `dashboard/settings/settings-model-context.tsx` — Customize meeting summarization system prompt
- `api/channels/register/` — Registers Google Drive push channel for the authenticated user
- `api/user/drive/files/` — Lists transcript files from Google Drive with run status
- `api/user/drive/trigger/` — Manually triggers transcript processing (also used for retries)
- `api/user/jobs/` — Paginated workflow run history API
- `api/user/jobs/[id]/` — Single run fetch by ID with artifact + deliveries (user-scoped)
- `api/user/config/` — User config CRUD
- `api/user/channels/` — Push channel management
- `api/user/connectors/clickup/` — ClickUp proxy APIs: `workspaces/`, `spaces/`, `folders/`, `config/`
- `api/user/delivery/[id]/retry/` — Retry a failed artifact delivery
- `api/user/alerts/acknowledge/` — Acknowledge channel renewal alerts
- `api/webhooks/google-drive/` — Receives Google Drive push notifications, creates SourceEvent/SourceItem records
- `api/webhooks/connectors/[connectorId]/` — Universal connector webhook endpoint for omnichannel ingestion (Slack Events API, etc.)
- `api/workers/process-transcript/` — QStash worker: runs MeetingSummaryHandler, creates Artifact, delivers via planner
- `api/workers/dead-letter/` — Dead letter handler
- `api/cron/renew-channels/` — Cron job for push channel renewal (every 6h, 24h buffer before expiry)
- `api/cron/process-triage-digest/` — Cron job for omnichannel triage digest (12 PM, 4 PM UTC): pulls PendingNotification records, classifies with LLM, delivers digest
- `api/auth/slack/` — Slack OAuth flow (connect, callback, disconnect)
- `api/auth/clickup/` — ClickUp OAuth flow (connect, callback, disconnect)

### `src/components/` — React components
- `dashboard/` — Domain components: RecentMeetingsPanel, DriveFilesPanel, HistoryTable, HistoryFilterBar, ConnectionsPanel, WorkflowsPanel, NoteDetailModal, AlertBanner, HowItWorksBox, ConnectorNudgeCard, FirstDeliveryBadge
- `ui/` — Reusable primitives: Card, Modal, FilterChip, SearchInput, StatusBadge, KpiCard, ToggleSwitch, InfoBox
- `layout/` — Sidebar, Topbar, PageHeader
- `auth/` — SignInButton, SignOutButton, UserAvatar
- `providers/` — SessionProvider wrapper for client-side session management

### `src/lib/` — Server-side logic
- `ai/` — OpenRouter client (`openrouter-client.ts`), prompt templates + Zod schemas in `prompts/meeting-summary.ts`
- `auth/` — NextAuth config, session helpers, route guard, OAuth helpers (`oauth-helpers.ts`)
- `crypto/` — AES encryption for user API keys and OAuth tokens
- `db/` — Prisma client singleton, scoped query functions (all user-scoped with userId in WHERE)
- `destinations/` — Destination provider contracts and delivery planner (see Destination Architecture below)
- `google/` — Drive API: channel registration, transcript fetching, webhook verification, authenticated Drive client factory (`get-drive-client.ts`)
- `queue/` — QStash client, job enqueue helper, signature verification
- `redis/` — Redis client, deduplication helpers
- `sources/` — Source provider contracts (`types.ts`): `SourceProviderContract` interface with `verifyRequest`, `resolveConnection`, `normalizeEvent`, `buildSourceItems`. Provider registry (`registry.ts`). Slack source provider (`slack/`) for Events API webhook ingestion.
- `workflows/` — Workflow handler contracts and implementations: `WorkflowHandler` interface, `MeetingSummaryHandler` (fetches transcript, calls OpenRouter, validates with Zod, returns artifact data)
- `utils/` — Shared utilities: `cleanMeetingTitle()` for parsing raw Google Meet filenames

### `src/lib/destinations/` — Destination Architecture
- `types.ts` — `DestinationProviderContract` interface with `validateConfig()` and `deliver()`. Artifact-centric: providers receive canonical `ArtifactForDelivery` objects, not meeting-summary-specific payloads.
- `planner.ts` — `deliverArtifact()` orchestrator: always delivers to NEXUS_HISTORY first, then queries enabled `DestinationConnection` records and delivers to each. Creates `ArtifactDelivery` records for tracking. Provider registry with factory functions.
- `nexus-history.ts` — `NexusHistoryProvider`: no-op deliver (artifact already persisted). Always validates.
- `slack-provider.ts` — `SlackDestinationProvider`: reads slackUserId from `DestinationConnection.externalAccountId`, formats message via `slack-formatter.ts`, sends via Slack bot token.
- `clickup-provider.ts` — `ClickUpDestinationProvider`: reads OAuth tokens from `DestinationConnection.oauthTokensEncrypted`, builds markdown via `markdown-formatter.ts`, creates/updates ClickUp Doc page. Returns externalUrl.
- `slack-formatter.ts` — Formats meeting summary as Slack Block Kit message
- `triage-formatter.ts` — Formats classified triage messages as Slack Block Kit digest and markdown
- `markdown-formatter.ts` — Formats meeting summary as markdown (used by ClickUp)

### `src/hooks/` — Client-side hooks
- `use-note-modal.ts` — Manages `?note=<runId>` URL param for deep-linked note modal

### `src/tests/` — Test suite
- `setup.ts` — Global test setup (Vitest)
- Empty placeholder directories exist for: `ai/`, `crypto/`, `destinations/`, `google/`, `redis/`, `webhooks/`

### `src/types/` — TypeScript type extensions
- `next-auth.d.ts` — Extends NextAuth Session interface to include `user.id`

### `src/generated/prisma/` — Auto-generated Prisma client (do not edit)

## UX Patterns
- **Note viewing**: Universal modal pattern — clicking any "Ready" item (Dashboard, History, Notes) opens `NoteDetailModal` which fetches `/api/user/jobs/[id]` and renders the full summary with a collapsible "Delivered to" section showing per-destination status. Deep-linkable via `?note=<runId>` URL param.
- **Delivery retry**: Failed deliveries in the summary modal have a per-destination retry button that hits `/api/user/delivery/[id]/retry`.
- **Failed run retry**: Failed items show a "Retry" button in History table, Notes panel, and detail modal. Retry re-enqueues via `/api/user/drive/trigger`. Error messages are displayed inline.
- **Title cleanup**: Raw Google Drive filenames (e.g. "Meeting – 2026/03/04 10:57 GMT+08:00 – Notes by Gemini") are cleaned via `cleanMeetingTitle()` before display across all surfaces.
- **Empty states**: All main pages have designed empty states with icons, contextual guidance, and CTAs.
- **Connector nudge card**: Promotional card on dashboard right panel appears after 3+ meetings when ClickUp is not connected. Dismissible via `UserConfig.dismissedConnectorNudge`.
- **Filtering**: History page uses server-side filtering (URL search params: `?status=`, `?search=`, `?page=`). Notes page uses client-side filtering (FilterChip + SearchInput over pre-fetched data).
- **Status badges**: Consistent `StatusBadge` component with variants: ready/processing/pending/failed/connected/active/expired.
- **Layout**: Sidebar navigation (Dashboard, Notes, History, Settings) + Topbar + scrollable content area.

## Destination Architecture
- **Additive model**: Nexus History is always on (non-negotiable). Additional destinations are independent toggles stored as `DestinationConnection` records with `enabled` flag.
- **Provider contract** (`src/lib/destinations/types.ts`): `DestinationProviderContract` interface with `validateConfig(config)` and `deliver(artifact, config)`. All providers receive a canonical `ArtifactForDelivery` object.
- **Delivery planner** (`src/lib/destinations/planner.ts`): `deliverArtifact(artifact, userId)` always delivers to NEXUS_HISTORY, then queries `getEnabledDestinationConnections(userId)` and delivers to each. Creates `ArtifactDelivery` records.
- **Adding a new destination**: (1) Create provider implementing `DestinationProviderContract`, (2) Register in planner's provider map, (3) Add OAuth routes in `api/auth/<name>/`, (4) Add `DestinationConnection` record for the user. No changes needed to the processing pipeline or queue.

## OAuth & Redirect URL Handling
- **Per-provider redirect base URLs**: OAuth redirect URIs are constructed via `buildOAuthRedirectUri(provider, path)` in `src/lib/auth/oauth-helpers.ts`.
- **Lookup order**: `{PROVIDER}_REDIRECT_BASE_URL` env var → `NEXTAUTH_URL` (default). This allows providers that require HTTPS callbacks (like Slack) to use an ngrok tunnel in dev, while others stay on localhost.
- **Example**: Set `SLACK_REDIRECT_BASE_URL=https://abc123.ngrok-free.app` → Slack OAuth redirects go through ngrok. ClickUp (no env var set) → uses `NEXTAUTH_URL` (localhost).
- **HMAC-signed state tokens**: OAuth CSRF protection uses HMAC-signed state tokens (`createOAuthState(userId)` / `verifyOAuthState(state)`) instead of cookies. This is necessary because cookies set on localhost aren't sent when the OAuth callback arrives through ngrok (different domain). The state token embeds the userId, so the callback can identify the user even when the session cookie isn't available on the ngrok domain.
- **Post-OAuth redirect**: Callbacks redirect to `getAppBaseUrl()` (always `NEXTAUTH_URL`) so the user returns to their normal browsing context.
- **Adding a new OAuth provider**: Import `buildOAuthRedirectUri`, `createOAuthState`, `verifyOAuthState`, and `getAppBaseUrl` from `@/lib/auth/oauth-helpers`. If the provider requires HTTPS, the user just sets `{PROVIDER}_REDIRECT_BASE_URL` in `.env`.

## Environment Variables
### Required
- `DATABASE_URL` — PostgreSQL connection string (Supabase pooler, session mode port 5432)
- `NEXTAUTH_SECRET` — NextAuth encryption secret
- `NEXTAUTH_URL` — App base URL (localhost in dev, real domain in prod)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` — Upstash QStash
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis
- `ENCRYPTION_SECRET` — AES key for encrypting stored secrets
- `WEBHOOK_BASE_URL` — Externally-reachable URL for Google Drive webhooks and QStash callbacks (ngrok in dev)

### Optional
- `OPENROUTER_API_KEY` — Global fallback OpenRouter key (users can provide their own via BYOK)
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` — Slack OAuth app credentials
- `SLACK_BOT_TOKEN` — Slack bot token for sending DMs
- `SLACK_SIGNING_SECRET` — Slack app signing secret for webhook signature verification (omnichannel triage)
- `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET` — ClickUp OAuth app credentials
- `CRON_SECRET` — Vercel cron authentication
- `{PROVIDER}_REDIRECT_BASE_URL` — Per-provider OAuth redirect override (e.g. `SLACK_REDIRECT_BASE_URL` for ngrok HTTPS tunnel in dev)

## Database Setup
- **Full reset (dev)**: `npx prisma db push --force-reset` — drops all tables and recreates from schema
- **Generate client**: `npx prisma generate` — regenerates client to `src/generated/prisma/`
- **Prisma config**: `prisma.config.ts` loads `.env.local` then `.env` via dotenv
- **Connection**: Uses Supabase session-mode pooler (`aws-*.pooler.supabase.com:5432`) since the direct connection is IPv6-only

## Important Conventions
- All database queries in `src/lib/db/scoped-queries.ts` are **user-scoped** (userId in WHERE clause) for access control
- API routes check `getSession()` and return 401 if unauthenticated
- Encrypted fields (API keys, OAuth tokens) use AES-256-GCM via `src/lib/crypto/encryption.ts`
- Generated Prisma client is at `src/generated/prisma/` — import types from `@/generated/prisma/`
- CSS variables defined in `globals.css`: `--bg`, `--surface`, `--surface2`, `--border`, `--border2`, `--brand`, `--brand-lt`, `--brand-md`, `--text`, `--muted`, `--muted2`, `--green`, `--green-lt`, `--amber`, `--amber-lt`, `--red`, `--red-lt`, `--shadow`, `--shadow-md`. Tailwind mappings use `--color-*` aliases.
- No external UI component library — all components are hand-built with Tailwind
- Push channel auto-renewal runs via Vercel cron every 6 hours, renewing channels expiring within 24 hours
- Prisma JSON null handling: use `Prisma.JsonNull` instead of raw `null` for JSON columns in upserts
- OAuth tokens stored as AES-256-GCM encrypted text in `DestinationConnection.oauthTokensEncrypted`
- Schema changes use `prisma db push` (no migration history) — not `prisma migrate`

# Nexus — Project Overview

## What It Is
Nexus is a **Meeting Intelligence** app that automatically captures Google Meet transcripts from Google Drive, processes them with AI (via OpenRouter), and delivers structured summaries to multiple configurable destinations. Nexus History (database) is always active; Slack DM, Attio CRM, and ClickUp are independent, additive output toggles.

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
3. When a new transcript appears → webhook at `/api/webhooks/google-drive` fires → enqueues job via QStash
4. Worker at `/api/workers/process-transcript` fetches transcript, runs AI summarization, stores result
5. Job lifecycle tracked in `JobHistory` model: PENDING → PROCESSING → COMPLETED/FAILED
6. `resultPayload` (JSON) contains structured summary: title, date, attendees, summary text, action items, decisions, follow-ups
7. Delivery is **additive**: summaries always saved to database; additional destinations (Slack DM, Attio CRM notes, ClickUp Docs) are independently enabled per user
8. The delivery router fans out to all enabled destinations, writing a `DeliveryLog` entry per destination per summary
9. Users can also manually trigger processing from the Notes page, or retry failed jobs/deliveries from History/Notes

## Key Data Models (Prisma)
- **User** — NextAuth user with accounts, sessions
- **UserConfig** — per-user settings: `meetingSummariesEnabled` (auto-process toggle), `slackDmEnabled` (Slack DM toggle), `dismissedConnectorNudge`, encrypted API keys, custom system prompt
- **PushChannel** — Google Drive watch channel (channelId, resourceId, expiration)
- **JobHistory** — transcript processing jobs (status enum: PENDING/PROCESSING/COMPLETED/FAILED, sourceFileId, resultPayload JSON, destinationDelivered stores comma-separated list e.g. "DATABASE,SLACK,attio,clickup")
- **UserConnectorConfig** — per-user connector state: connectorId, enabled, configJson (JSONB), encrypted oauthTokens, status (CONNECTED/DISCONNECTED/EXPIRED). Unique on (userId, connectorId).
- **DeliveryLog** — per-destination delivery tracking: summaryId, connectorId, status (PENDING/DELIVERED/FAILED), errorMessage, deliveredAt, retryCount
- **FailedJob** — dead letter queue for failed async jobs
- **ChannelRenewalError** — tracks push channel renewal failures with `acknowledged` flag for alert dismissal

## Directory Structure

### `src/app/` — Next.js App Router pages & API routes
- `dashboard/page.tsx` — Main dashboard: KPI cards, RecentMeetingsPanel, ConnectionsPanel, WorkflowsPanel, ConnectorNudgeCard
- `dashboard/notes/page.tsx` — Dedicated page for browsing Google Drive transcripts (DriveFilesPanel)
- `dashboard/history/page.tsx` — Paginated job history with filters, multi-destination pill badges
- `dashboard/settings/page.tsx` — User settings (connections, destinations, workflows, API key, model context)
- `dashboard/settings/attio-config-modal.tsx` — Attio configuration modal (object type → record search → save)
- `dashboard/settings/clickup-config-modal.tsx` — ClickUp configuration modal (workspace → space → folder → save)
- `api/user/drive/files/` — Lists transcript files from Google Drive with job status
- `api/user/drive/trigger/` — Manually triggers transcript processing (also used for retries)
- `api/user/jobs/` — Paginated job history API
- `api/user/jobs/[id]/` — Single job fetch by ID with delivery logs (user-scoped)
- `api/user/config/` — User config CRUD
- `api/user/channels/` — Push channel management
- `api/user/connectors/attio/` — Attio proxy APIs: `objects/`, `records/`, `config/`
- `api/user/connectors/clickup/` — ClickUp proxy APIs: `workspaces/`, `spaces/`, `folders/`, `config/`
- `api/user/delivery/[id]/retry/` — Retry a failed delivery log entry
- `api/user/alerts/acknowledge/` — Acknowledge channel renewal alerts
- `api/webhooks/google-drive/` — Receives Google Drive push notifications
- `api/workers/process-transcript/` — QStash worker for AI processing
- `api/workers/dead-letter/` — Dead letter handler
- `api/cron/renew-channels/` — Cron job for push channel renewal (every 6h, 24h buffer before expiry)
- `api/auth/slack/` — Slack OAuth flow (connect, callback, disconnect)
- `api/auth/attio/` — Attio OAuth flow (connect, callback, disconnect)
- `api/auth/clickup/` — ClickUp OAuth flow (connect, callback, disconnect)

### `src/components/` — React components
- `dashboard/` — Domain components: RecentMeetingsPanel, DriveFilesPanel, HistoryTable, HistoryFilterBar, ConnectionsPanel, WorkflowsPanel, NoteDetailModal, AlertBanner, HowItWorksBox, ConnectorNudgeCard, FirstDeliveryBadge
- `ui/` — Reusable primitives: Card, Modal, FilterChip, SearchInput, StatusBadge, KpiCard, ToggleSwitch, InfoBox
- `layout/` — Sidebar, Topbar, PageHeader
- `auth/` — SignInButton, SignOutButton, UserAvatar

### `src/lib/` — Server-side logic
- `ai/` — OpenRouter client, meeting processing pipeline, Zod schemas for AI output, prompt templates
- `auth/` — NextAuth config, session helpers, route guard
- `connectors/` — **Connector framework** (see Connector Architecture below)
- `crypto/` — AES encryption for user API keys and OAuth tokens
- `db/` — Prisma client singleton, scoped query functions (all user-scoped with userId in WHERE)
- `destinations/` — Legacy output routing: DestinationProvider interface, DatabaseProvider, SlackProvider, slack-formatter; plus `deliverToAllDestinations()` which handles both legacy and connector destinations
- `google/` — Drive API: channel registration, transcript fetching, webhook verification
- `queue/` — QStash client, job enqueue helper, signature verification
- `redis/` — Redis client, deduplication helpers
- `utils/` — Shared utilities: `cleanMeetingTitle()` for parsing raw Google Meet filenames

### `src/lib/connectors/` — Connector Framework
- `types.ts` — Connector interface contract: `Connector`, `AuthResult`, `ConnectionStatus`, `UserConnectorConfig`, `DeliveryResult`, `ConnectorConfigSchema`
- `payload.ts` — Canonical `MeetingSummaryPayload` type (Zod schema) + `buildPayloadFromLegacy()` converter
- `markdown-formatter.ts` — Shared `formatSummaryAsMarkdown()` used by both Attio and ClickUp
- `registry.ts` — Map-based connector registry: `registerConnector()`, `getConnectorProvider()`, `getAllConnectors()`
- `setup.ts` — Registers Attio + ClickUp connectors at startup
- `connector-auth.ts` — Token management: `getConnectorTokens()`, `refreshAttioToken()`, `connectorFetch()` (auto-refresh on 401)
- `attio-connector.ts` — AttioConnector: ManualSelection record strategy, creates notes via Attio API
- `clickup-connector.ts` — ClickUpConnector: two-step Doc + Page creation via ClickUp API

### `src/hooks/` — Client-side hooks
- `use-note-modal.ts` — Manages `?note=<jobId>` URL param for deep-linked note modal

### `src/tests/connectors/` — Connector unit tests
- `markdown-formatter.test.ts` — Markdown output formatting
- `registry.test.ts` — Connector registration and lookup
- `payload.test.ts` — Legacy-to-canonical payload conversion
- `ui-helpers.test.ts` — Destination label mapping and string parsing

### `src/generated/prisma/` — Auto-generated Prisma client (do not edit)

## UX Patterns
- **Note viewing**: Universal modal pattern — clicking any "Ready" item (Dashboard, History, Notes) opens `NoteDetailModal` which fetches `/api/user/jobs/[id]` and renders the full summary with a collapsible "Delivered to" section showing per-destination status. Deep-linkable via `?note=<jobId>` URL param.
- **Delivery indicators**: Recent meetings on the dashboard show compact destination labels below the title. History table displays destination pill badges per row.
- **Delivery retry**: Failed delivery pills in the summary modal have a per-destination retry button that hits `/api/user/delivery/[id]/retry`.
- **Failed job retry**: Failed items show a "Retry" button in History table, Notes panel, and detail modal. Retry re-enqueues via `/api/user/drive/trigger`. Error messages are displayed inline.
- **Title cleanup**: Raw Google Drive filenames (e.g. "Meeting – 2026/03/04 10:57 GMT+08:00 – Notes by Gemini") are cleaned via `cleanMeetingTitle()` before display across all surfaces.
- **Empty states**: All main pages have designed empty states with icons, contextual guidance, and CTAs. Empty states mention connected destinations.
- **Connector nudge card**: Promotional card on dashboard right panel appears after 3+ meetings when Attio/ClickUp are not connected. Dismissible via `UserConfig.dismissedConnectorNudge`.
- **First delivery badge**: One-time celebration badge (localStorage-based) on first delivery per connector destination.
- **Filtering**: History page uses server-side filtering (URL search params: `?status=`, `?search=`, `?page=`). Notes page uses client-side filtering (FilterChip + SearchInput over pre-fetched data).
- **Status badges**: Consistent `StatusBadge` component with variants: ready/processing/pending/failed/connected/active/expired.
- **Layout**: Sidebar navigation (Dashboard, Notes, History, Settings) + Topbar + scrollable content area.

## Connector Architecture
- **Interface**: Every output connector implements the `Connector` interface (`src/lib/connectors/types.ts`) with: `authenticate()`, `disconnect()`, `healthCheck()`, `getConfigSchema()`, `validateConfig()`, `deliver()`
- **Registry pattern**: Connectors register via `registerConnector()` in `setup.ts`. The delivery router discovers them via `getConnectorProvider()`.
- **Canonical payload**: AI output is converted to `MeetingSummaryPayload` via `buildPayloadFromLegacy()`. All connectors consume this canonical format.
- **OAuth pattern**: All OAuth flows (Slack, Attio, ClickUp) follow the same pattern: CSRF state in httpOnly cookie → redirect to provider → callback exchanges code → tokens encrypted via AES-256-GCM → stored in `UserConnectorConfig.oauthTokens` → redirect to settings with query param.
- **Token management**: `connectorFetch()` in `connector-auth.ts` wraps fetch with auto-refresh on 401 (Attio tokens expire; ClickUp tokens don't).
- **Delivery fan-out**: `deliverToAllDestinations()` in `router.ts` handles legacy destinations (DATABASE, SLACK) and new connector destinations in sequence, writing `DeliveryLog` per delivery.
- **Adding a new connector**: (1) Create connector class implementing `Connector`, (2) Register in `setup.ts`, (3) Add OAuth routes in `api/auth/<name>/`, (4) Optionally add config proxy APIs in `api/user/connectors/<name>/`. No changes needed to the processing pipeline or queue.

## Destination Architecture
- **Additive model**: Database (Nexus History) is always on (non-negotiable). Additional destinations are independent toggles: Slack (`UserConfig.slackDmEnabled`), Attio and ClickUp (`UserConnectorConfig.enabled`).
- **Legacy destinations** (`src/lib/destinations/`): `DestinationProvider` interface with `DatabaseProvider` and `SlackProvider`. Still active and used by the router.
- **Connector destinations** (`src/lib/connectors/`): `Connector` interface with `AttioConnector` and `ClickUpConnector`. Discovered from `user_connector_config` table.
- **Router** (`src/lib/destinations/router.ts`): `deliverToAllDestinations()` merges legacy and connector destinations, writes `DeliveryLog` entries, updates `JobHistory.destinationDelivered` for backward compat.

## Environment Variables
### Required
- `DATABASE_URL` — PostgreSQL connection string (Supabase)
- `NEXTAUTH_SECRET` — NextAuth encryption secret
- `NEXTAUTH_URL` — App base URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` — Upstash QStash
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis
- `ENCRYPTION_KEY` — AES key for encrypting stored secrets

### Optional (connector-specific)
- `ATTIO_CLIENT_ID`, `ATTIO_CLIENT_SECRET` — Attio OAuth app credentials
- `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET` — ClickUp OAuth app credentials

## Database Setup
- **Full reset (dev)**: `npx prisma db push --force-reset` — drops all tables and recreates from schema
- **Migration-based**: `npx prisma migrate reset` — drops, recreates, and marks migrations as applied
- **Generate client**: `npx prisma generate` — regenerates client to `src/generated/prisma/`
- **Prisma config**: `prisma.config.ts` loads `.env.local` then `.env` via dotenv

## Important Conventions
- All database queries in `src/lib/db/scoped-queries.ts` are **user-scoped** (userId in WHERE clause) for access control
- API routes check `getSession()` and return 401 if unauthenticated
- Encrypted fields (API keys, webhooks, OAuth tokens) use AES via `src/lib/crypto/encryption.ts`
- Generated Prisma client is at `src/generated/prisma/` — import types from `@/generated/prisma/`
- CSS variables defined in `globals.css`: `--bg`, `--surface`, `--border`, `--brand`, `--brand-lt`, `--text`, `--muted`, `--muted2`, `--green`, `--amber`, `--red`
- No external UI component library — all components are hand-built with Tailwind
- Push channel auto-renewal runs via Vercel cron every 6 hours, renewing channels expiring within 24 hours
- Prisma JSON null handling: use `Prisma.JsonNull` instead of raw `null` for JSON columns in upserts
- OAuth tokens stored as AES-256-GCM encrypted text in `UserConnectorConfig.oauthTokens`

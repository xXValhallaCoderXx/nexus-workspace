# Directory Structure

## `src/app/` — Next.js App Router pages & API routes

### Pages
- `page.tsx` — Root home/login page: redirects authenticated users to `/dashboard`
- `layout.tsx` — Root layout: SessionProvider, Inter font, metadata
- `dashboard/layout.tsx` — Dashboard shell: Sidebar + scrollable content, processing badge
- `dashboard/page.tsx` — Main dashboard: KPI cards, RecentMeetingsPanel, ConnectionsPanel, WorkflowsPanel, ConnectorNudgeCard
- `dashboard/notes/page.tsx` — Browse Google Drive transcripts (DriveFilesPanel)
- `dashboard/history/page.tsx` — Paginated workflow run history with filters
- `dashboard/settings/page.tsx` — User settings hub

### Settings Components
- `settings-connections.tsx` — Manage Google/Slack/ClickUp connections + push channel
- `settings-destination.tsx` — Toggle output destinations
- `settings-workflows.tsx` — Toggle auto-summarization, Quiet Mode toggle + Sync Now button
- `settings-api-key.tsx` — Manage OpenRouter API key (BYOK)
- `settings-model-context.tsx` — Customize meeting summary system prompt
- `clickup-config-modal.tsx` — ClickUp workspace → space → folder configuration

### User API Routes
- `api/user/config/` — User config CRUD (GET returns all settings, PATCH updates)
- `api/user/jobs/` — Paginated workflow run history
- `api/user/jobs/[id]/` — Single run with artifact + deliveries
- `api/user/drive/files/` — List transcript files from Google Drive
- `api/user/drive/trigger/` — Manually trigger transcript processing / retry
- `api/user/channels/` — Push channel management
- `api/user/delivery/[id]/retry/` — Retry a failed artifact delivery
- `api/user/alerts/acknowledge/` — Acknowledge channel renewal alerts
- `api/user/connectors/clickup/` — ClickUp proxy APIs: `workspaces/`, `spaces/`, `folders/`, `config/`
- `api/user/triage/trigger/` — Manual triage sync: pulls Slack mentions via `search.messages`, creates PendingNotifications, processes digest

### Webhook Routes
- `api/webhooks/google-drive/` — Google Drive push notifications → SourceEvent/SourceItem creation
- `api/webhooks/connectors/[connectorId]/` — Universal connector webhook (Slack Events API `app_mention`, URL verification)

### Worker Routes
- `api/workers/process-transcript/` — QStash worker: MeetingSummaryHandler → Artifact → delivery
- `api/workers/dead-letter/` — Dead letter handler

### Cron Routes
- `api/cron/renew-channels/` — Push channel renewal (every 6h)
- `api/cron/process-triage-digest/` — Triage digest processing (12 PM, 4 PM UTC)

### Auth Routes
- `api/channels/register/` — Register Google Drive push channel
- `api/auth/slack/` — Slack OAuth V2 flow (connect with `user_scope=search:read`, callback, disconnect)
- `api/auth/clickup/` — ClickUp OAuth flow (connect, callback, disconnect)

## `src/components/` — React components

- `dashboard/` — RecentMeetingsPanel, DriveFilesPanel, HistoryTable, HistoryFilterBar, ConnectionsPanel, WorkflowsPanel, NoteDetailModal, AlertBanner, HowItWorksBox, ConnectorNudgeCard, FirstDeliveryBadge
- `ui/` — Card, Modal, FilterChip, SearchInput, StatusBadge, KpiCard, ToggleSwitch, InfoBox
- `layout/` — Sidebar, Topbar, PageHeader
- `auth/` — SignInButton, SignOutButton, UserAvatar
- `providers/` — SessionProvider wrapper

## `src/lib/` — Server-side logic

### `ai/`
- `openrouter-client.ts` — OpenRouter API client with retry (429/502/503 exponential backoff), `maxTokens` support, 60s timeout
- `prompts/meeting-summary.ts` — Meeting summary prompt + Zod schema
- `prompts/triage-classification.ts` — Triage classification prompt + Zod schema, content truncation (`MAX_MESSAGE_CHARS: 1000`, `MAX_PAYLOAD_CHARS: 30000`, `MAX_MESSAGES_PER_BATCH: 50`)

### `auth/`
- NextAuth config, session helpers, route guard
- `oauth-helpers.ts` — `buildOAuthRedirectUri()`, `createOAuthState()`, `verifyOAuthState()`, `getAppBaseUrl()`

### `crypto/`
- `encryption.ts` — AES-256-GCM encrypt/decrypt for API keys and OAuth tokens

### `db/`
- `prisma.ts` — Prisma client singleton
- `scoped-queries.ts` — All user-scoped DB helpers (userId in WHERE). Functions for: UserConfig, DestinationConnection, WorkflowRun, Artifact, ArtifactDelivery, PendingNotification CRUD

### `destinations/`
See [Destinations](./destinations.md).

### `google/`
- Drive API: channel registration, transcript fetching, webhook verification
- `get-drive-client.ts` — Authenticated Drive client factory

### `queue/`
- QStash client, job enqueue helper, signature verification

### `redis/`
- Redis client, deduplication helpers

### `sources/`
- `types.ts` — `SourceProviderContract` interface: `verifyRequest`, `resolveConnection`, `normalizeEvent`, `buildSourceItems`
- `registry.ts` — Source provider factory/registry
- `slack/slack-source-provider.ts` — Slack Events API provider (signature verification, event normalization, relevant user lookup)
- `slack/verify-signature.ts` — HMAC-SHA256 Slack request verification
- `slack/fetch-mentions.ts` — Pull-based mention fetcher using `search.messages` API
- `slack/types.ts` — Slack Events API payload types
- `slack/register.ts` — Provider registration side-effect import

### `workflows/`
- `WorkflowHandler` interface
- `MeetingSummaryHandler` — Fetches transcript, calls OpenRouter, validates with Zod
- `process-digest.ts` — Shared triage digest processing: LLM classification → formatting → delivery (used by cron and manual trigger)

### `utils/`
- `cleanMeetingTitle()` — Parses raw Google Meet filenames

## `src/hooks/`
- `use-note-modal.ts` — Manages `?note=<runId>` URL param for deep-linked modal

## `src/tests/`
- `setup.ts` — Global Vitest setup
- `ai/triage-classification.test.ts` — Triage prompt/schema tests (5 tests)
- `sources/slack-verify-signature.test.ts` — Slack signature verification (6 tests)
- `destinations/triage-formatter.test.ts` — Digest formatter tests (8 tests)

## `src/types/`
- `next-auth.d.ts` — Extends NextAuth Session to include `user.id`

## `src/generated/prisma/` — Auto-generated Prisma client (do not edit)

## `scripts/`
- `test-triage-digest.ts` — E2E test: seeds mentions, enables quiet mode, triggers cron, verifies results

## Root Config
- `vercel.json` — Cron schedules (renew-channels every 6h, process-triage-digest at 12 PM + 4 PM UTC)
- `prisma.config.ts` — Prisma config, loads `.env.local` then `.env`
- `vitest.config.ts` — Vitest configuration
- `eslint.config.mjs` — ESLint configuration

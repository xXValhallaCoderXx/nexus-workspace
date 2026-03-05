# Nexus — Project Overview

## What It Is
Nexus is a **Meeting Intelligence** POC that automatically captures Google Meet transcripts from Google Drive, processes them with AI (via OpenRouter), and delivers structured summaries to configurable destinations. Database (Nexus History) is always active; Slack DM is an independent, additive toggle.

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
7. Delivery is **additive**: summaries always saved to database; optionally sent via Slack DM based on user's `slackDmEnabled` toggle
8. Users can also manually trigger processing from the Notes page, or retry failed jobs from History/Notes

## Key Data Models (Prisma)
- **User** — NextAuth user with accounts, sessions
- **UserConfig** — per-user settings: `meetingSummariesEnabled` (auto-process toggle), `slackDmEnabled` (independent Slack DM toggle), encrypted API keys, custom system prompt
- **PushChannel** — Google Drive watch channel (channelId, resourceId, expiration)
- **JobHistory** — transcript processing jobs (status enum: PENDING/PROCESSING/COMPLETED/FAILED, sourceFileId, resultPayload JSON, destinationDelivered stores comma-separated list e.g. "DATABASE, SLACK")
- **FailedJob** — dead letter queue for failed async jobs
- **ChannelRenewalError** — tracks push channel renewal failures with `acknowledged` flag for alert dismissal

## Directory Structure

### `src/app/` — Next.js App Router pages & API routes
- `dashboard/page.tsx` — Main dashboard: KPI cards, RecentMeetingsPanel, ConnectionsPanel, WorkflowsPanel
- `dashboard/notes/page.tsx` — Dedicated page for browsing Google Drive transcripts (DriveFilesPanel)
- `dashboard/history/page.tsx` — Paginated job history with filters
- `dashboard/settings/page.tsx` — User settings (connections, workflows, API key, model context)
- `api/user/drive/files/` — Lists transcript files from Google Drive with job status
- `api/user/drive/trigger/` — Manually triggers transcript processing (also used for retries)
- `api/user/jobs/` — Paginated job history API
- `api/user/jobs/[id]/` — Single job fetch by ID (user-scoped)
- `api/user/config/` — User config CRUD
- `api/user/channels/` — Push channel management
- `api/user/alerts/acknowledge/` — Acknowledge channel renewal alerts
- `api/webhooks/google-drive/` — Receives Google Drive push notifications
- `api/workers/process-transcript/` — QStash worker for AI processing
- `api/workers/dead-letter/` — Dead letter handler
- `api/cron/renew-channels/` — Cron job for push channel renewal (every 6h, 24h buffer before expiry)
- `api/auth/slack/` — Slack OAuth flow (connect, callback, disconnect)

### `src/components/` — React components
- `dashboard/` — Domain components: RecentMeetingsPanel, DriveFilesPanel, HistoryTable, HistoryFilterBar, ConnectionsPanel, WorkflowsPanel, NoteDetailModal, AlertBanner, HowItWorksBox
- `ui/` — Reusable primitives: Card, Modal, FilterChip, SearchInput, StatusBadge, KpiCard, ToggleSwitch, InfoBox
- `layout/` — Sidebar, Topbar, PageHeader
- `auth/` — SignInButton, SignOutButton, UserAvatar

### `src/lib/` — Server-side logic
- `ai/` — OpenRouter client, meeting processing pipeline, Zod schemas for AI output, prompt templates
- `auth/` — NextAuth config, session helpers, route guard
- `crypto/` — AES encryption for user API keys
- `db/` — Prisma client singleton, scoped query functions (all user-scoped with userId in WHERE)
- `destinations/` — Output routing: DestinationProvider interface, DatabaseProvider, SlackProvider, slack-formatter, router with `getEnabledDestinations()` for additive delivery
- `google/` — Drive API: channel registration, transcript fetching, webhook verification
- `queue/` — QStash client, job enqueue helper, signature verification
- `redis/` — Redis client, deduplication helpers
- `utils/` — Shared utilities: `cleanMeetingTitle()` for parsing raw Google Meet filenames

### `src/hooks/` — Client-side hooks
- `use-note-modal.ts` — Manages `?note=<jobId>` URL param for deep-linked note modal

### `src/generated/prisma/` — Auto-generated Prisma client (do not edit)

## UX Patterns
- **Note viewing**: Universal modal pattern — clicking any "Ready" item (Dashboard, History, Notes) opens `NoteDetailModal` which fetches `/api/user/jobs/[id]` and renders the full summary. Deep-linkable via `?note=<jobId>` URL param.
- **Failed job retry**: Failed items show a "Retry" button in History table, Notes panel, and detail modal. Retry re-enqueues via `/api/user/drive/trigger`. Error messages are displayed inline.
- **Title cleanup**: Raw Google Drive filenames (e.g. "Meeting – 2026/03/04 10:57 GMT+08:00 – Notes by Gemini") are cleaned via `cleanMeetingTitle()` before display across all surfaces.
- **Empty states**: All main pages have designed empty states with icons, contextual guidance, and CTAs (e.g. link to Notes page, guidance about enabling Gemini notes).
- **Filtering**: History page uses server-side filtering (URL search params: `?status=`, `?search=`, `?page=`). Notes page uses client-side filtering (FilterChip + SearchInput over pre-fetched data).
- **Status badges**: Consistent `StatusBadge` component with variants: ready/processing/pending/failed/connected.
- **Layout**: Sidebar navigation (Dashboard, Notes, History, Settings) + Topbar + scrollable content area.

## Destination Architecture
- **Additive model**: Database is always on (non-negotiable). Additional destinations (Slack) are independent toggles.
- **DestinationProvider interface** (`src/lib/destinations/types.ts`): `deliver(payload, userId)` → `DeliveryResult`
- **Router** (`src/lib/destinations/router.ts`): factory pattern with provider registry + `getEnabledDestinations(config)` returning array of enabled destination names
- **Adding a new destination**: create a new provider class implementing `DestinationProvider`, add one entry to the `providers` map in `router.ts`. No changes needed to the processing pipeline or queue.
- **Config**: `UserConfig.slackDmEnabled` controls Slack delivery independently. No single-select dropdown — each destination has its own toggle.

## Important Conventions
- All database queries in `src/lib/db/scoped-queries.ts` are **user-scoped** (userId in WHERE clause) for access control
- API routes check `getSession()` and return 401 if unauthenticated
- Encrypted fields (API keys, webhooks) use AES via `src/lib/crypto/encryption.ts`
- Generated Prisma client is at `src/generated/prisma/` — import types from `@/generated/prisma/`
- CSS variables defined in `globals.css`: `--bg`, `--surface`, `--border`, `--brand`, `--brand-lt`, `--text`, `--muted`, `--muted2`, `--green`, `--amber`, `--red`
- No external UI component library — all components are hand-built with Tailwind
- Push channel auto-renewal runs via Vercel cron every 6 hours, renewing channels expiring within 24 hours

# Nexus — Project Overview

## What It Is
Nexus is a **Meeting Intelligence** POC that automatically captures Google Meet transcripts from Google Drive, processes them with AI (via OpenRouter), and delivers structured summaries to configurable destinations (database, Slack).

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
7. Users can also manually trigger processing from the Notes page

## Key Data Models (Prisma)
- **User** — NextAuth user with accounts, sessions
- **UserConfig** — per-user settings: auto-summarize toggle, destination, encrypted API keys
- **PushChannel** — Google Drive watch channel (channelId, resourceId, expiration)
- **JobHistory** — transcript processing jobs (status enum: PENDING/PROCESSING/COMPLETED/FAILED, sourceFileId, resultPayload JSON)
- **FailedJob** — dead letter queue for failed async jobs
- **ChannelRenewalError** — tracks push channel renewal failures

## Directory Structure

### `src/app/` — Next.js App Router pages & API routes
- `dashboard/page.tsx` — Main dashboard: KPI cards, RecentMeetingsPanel, ConnectionsPanel, WorkflowsPanel
- `dashboard/notes/page.tsx` — Dedicated page for browsing Google Drive transcripts (DriveFilesPanel)
- `dashboard/history/page.tsx` — Paginated job history with filters
- `dashboard/settings/page.tsx` — User settings (API key, destination, Slack webhook)
- `api/user/drive/files/` — Lists transcript files from Google Drive with job status
- `api/user/drive/trigger/` — Manually triggers transcript processing
- `api/user/jobs/` — Paginated job history API
- `api/user/jobs/[id]/` — Single job fetch by ID (user-scoped)
- `api/user/config/` — User config CRUD
- `api/user/channels/` — Push channel management
- `api/webhooks/google-drive/` — Receives Google Drive push notifications
- `api/workers/process-transcript/` — QStash worker for AI processing
- `api/workers/dead-letter/` — Dead letter handler
- `api/cron/renew-channels/` — Cron job for push channel renewal

### `src/components/` — React components
- `dashboard/` — Domain components: RecentMeetingsPanel, DriveFilesPanel, HistoryTable, HistoryFilterBar, ConnectionsPanel, WorkflowsPanel, NoteDetailModal, AlertBanner
- `ui/` — Reusable primitives: Card, Modal, FilterChip, SearchInput, StatusBadge, KpiCard, ToggleSwitch, InfoBox
- `layout/` — Sidebar, Topbar, PageHeader
- `auth/` — SignInButton, SignOutButton, UserAvatar

### `src/lib/` — Server-side logic
- `ai/` — OpenRouter client, meeting processing pipeline, Zod schemas for AI output, prompt templates
- `auth/` — NextAuth config, session helpers, route guard
- `crypto/` — AES encryption for user API keys
- `db/` — Prisma client singleton, scoped query functions (all user-scoped with userId in WHERE)
- `destinations/` — Output routing: database provider, Slack provider, formatter
- `google/` — Drive API: channel registration, transcript fetching, webhook verification
- `queue/` — QStash client, job enqueue helper, signature verification
- `redis/` — Redis client, deduplication helpers

### `src/hooks/` — Client-side hooks
- `use-note-modal.ts` — Manages `?note=<jobId>` URL param for deep-linked note modal

### `src/generated/prisma/` — Auto-generated Prisma client (do not edit)

## UX Patterns
- **Note viewing**: Universal modal pattern — clicking any "Ready" item (Dashboard, History, Notes) opens `NoteDetailModal` which fetches `/api/user/jobs/[id]` and renders the full summary. Deep-linkable via `?note=<jobId>` URL param.
- **Filtering**: History page uses server-side filtering (URL search params: `?status=`, `?search=`, `?page=`). Notes page uses client-side filtering (FilterChip + SearchInput over pre-fetched data).
- **Status badges**: Consistent `StatusBadge` component with variants: ready/processing/pending/failed.
- **Layout**: Sidebar navigation (Dashboard, Notes, History, Settings) + Topbar + scrollable content area.

## Important Conventions
- All database queries in `src/lib/db/scoped-queries.ts` are **user-scoped** (userId in WHERE clause) for access control
- API routes check `getSession()` and return 401 if unauthenticated
- Encrypted fields (API keys, webhooks) use AES via `src/lib/crypto/encryption.ts`
- Generated Prisma client is at `src/generated/prisma/` — import types from `@/generated/prisma/`
- CSS variables defined in `globals.css`: `--bg`, `--surface`, `--border`, `--brand`, `--brand-lt`, `--text`, `--muted`, `--muted2`, `--green`, `--amber`, `--red`
- No external UI component library — all components are hand-built with Tailwind

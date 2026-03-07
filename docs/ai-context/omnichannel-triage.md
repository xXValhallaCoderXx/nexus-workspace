# Omnichannel Triage (Slack Quiet Mode)

## Overview

When a user enables **Quiet Mode**, Slack @mentions are batched into a triage digest instead of generating real-time notifications. An LLM classifies each message as ACTION_REQUIRED, READ_ONLY, or NOISE, and the digest is delivered to all enabled destinations. Recent digests also power the dedicated `/dashboard/mentions` workspace.

## Data Flow

```
@mention in Slack
      │
      ├─── Push path: Slack Events API webhook ──→ PendingNotification
      │
      ├─── Pull path: "Sync Now" button ──→ search.messages ──→ PendingNotification
      │
      ▼
PendingNotification records (batched)
      │
      ▼
LLM Classification (OpenRouter)
      │
      ▼
Formatted Digest (Block Kit + Markdown)
      │
      ▼
Delivery Planner (Nexus History + Slack DM + ClickUp)
      │
      ▼
PendingNotifications deleted
```

`PendingNotification` rows are queue-only: they are unclassified before processing and removed after the digest run completes. The Mentions workspace is therefore built from stored triage digest artifact payloads rather than from the live pending queue.

## Ingestion: Push Path (Webhooks)

**Route**: `POST /api/webhooks/connectors/[connectorId]`

1. Slack sends `event_callback` with `app_mention` event type
2. Webhook verifies signature via HMAC-SHA256 (`SLACK_SIGNING_SECRET`)
3. Finds all users with `quietModeEnabled: true` and a connected Slack destination
4. Creates `PendingNotification` record per user (deduplicated by `externalMessageId`)

**Requirements**: Slack app must have `app_mentions:read` bot event subscription configured. `SLACK_SIGNING_SECRET` must be set in env.

**Files**:
- `src/app/api/webhooks/connectors/[connectorId]/route.ts`
- `src/lib/sources/slack/verify-signature.ts`
- `src/lib/sources/slack/types.ts`

## Ingestion: Pull Path (Manual Sync)

**Route**: `POST /api/user/triage/trigger` (session-authenticated)

1. Reads user's Slack user ID from `DestinationConnection.externalAccountId`
2. Decrypts user's OAuth token from `DestinationConnection.oauthTokensEncrypted`
3. Calls Slack `search.messages` API: `query=<@SLACK_USER_ID> after:YYYY-MM-DD` (last 24h, max 100 results)
4. Creates `PendingNotification` records (unique constraint handles deduplication — `P2002` errors are caught and skipped)
5. Processes all pending notifications through the digest pipeline

**Requirements**: User must re-authorize Slack (OAuth V2 with `search:read` scope). Token stored encrypted.

**Files**:
- `src/app/api/user/triage/trigger/route.ts`
- `src/lib/sources/slack/fetch-mentions.ts`

## Slack OAuth (V2)

The Slack OAuth flow was upgraded from OIDC (`openid profile email`) to OAuth V2 to support `search.messages`.

**Initiate**: `GET /api/auth/slack`
- Redirects to `https://slack.com/oauth/v2/authorize` with `user_scope=search:read`

**Callback**: `GET /api/auth/slack/callback`
- Exchanges code at `https://slack.com/api/oauth.v2.access`
- Extracts `authed_user.id` (Slack user ID) and `authed_user.access_token`
- Encrypts user access token → stores in `DestinationConnection.oauthTokensEncrypted`
- Stores Slack user ID in `DestinationConnection.externalAccountId`
- Stores team ID in `DestinationConnection.configJson`

**Token usage**:
- **User token** (`oauthTokensEncrypted`): `search.messages` for pull-based sync
- **Bot token** (`SLACK_BOT_TOKEN` env): Sending DMs, posting digests

## Processing: Digest Pipeline

**Shared function**: `processUserDigest(userId, notifications, triggerType)` in `src/lib/workflows/process-digest.ts`

Used by both:
- Cron endpoint (`/api/cron/process-triage-digest`) — processes all users' pending notifications
- Manual trigger (`/api/user/triage/trigger`) — processes current user only

### Steps

1. **Resolve API key**: User's encrypted key → env fallback `OPENROUTER_API_KEY`
2. **Build LLM input**: Map notifications to `TriageMessageInput[]`, apply content truncation (1K chars/message, 30K total, 50 message cap)
3. **Call OpenRouter**: Model `meta-llama/llama-3-8b-instruct`, `response_format: json_object`, `max_tokens: 2048`
4. **Parse response**: Validate against `triageClassificationOutput` Zod schema. On JSON parse failure, retry once with stricter prompt.
5. **Build classified messages**: Merge LLM classifications with notification metadata (author, channel, permalink)
6. **Create WorkflowRun**: `workflowType: SCHEDULED_DIGEST`, `triggerType: CRON | MANUAL`
7. **Format digest**: `formatTriageDigestBlocks()` (Slack Block Kit) + `formatTriageDigestMarkdown()` (plain text)
8. **Create Artifact**: `artifactType: DIGEST`, payload includes classifications + messages + blocks
9. **Deliver via planner**: Standard `deliverArtifact()` — Nexus History + all enabled destinations
10. **Update WorkflowRun**: Status → COMPLETED, store model + metrics
11. **Delete PendingNotifications**: Clean up processed records

### Classification Categories

| Category | Meaning | Examples |
|----------|---------|---------|
| `ACTION_REQUIRED` | Needs a response or action | Blocking questions, approval requests, direct asks |
| `READ_ONLY` | Worth reading, no action needed | PR reviews, FYI announcements, status updates |
| `NOISE` | Can be safely ignored | Bot noise, emoji reactions, casual chatter |

## Cron Schedule

Configured in `vercel.json`:
- `process-triage-digest`: Runs at **12:00 PM UTC** and **4:00 PM UTC**
- Auth: `Authorization: Bearer ${CRON_SECRET}`

The cron endpoint:
1. Calls `getPendingNotificationsGroupedByUser()` to get all pending notifications
2. For each user: checks `quietModeEnabled`, calls `processUserDigest()`
3. If user has quiet mode disabled, cleans up stale notifications

## UI Components

### Settings Toggle
In `settings-workflows.tsx`: "Quiet Mode (Triage Digest)" toggle. Only visible when Slack is connected (`hasSlackConnected`).

### Sync Now Button
Appears next to the Quiet Mode toggle when enabled. Calls `POST /api/user/triage/trigger`. Shows loading state and result feedback:
- "Fetched N from Slack · Processed N messages"
- "No mentions found" with helpful guidance
- Error messages from the API

### History Table
`HistoryTable` component handles `SCHEDULED_DIGEST` workflow type alongside `MEETING_SUMMARY`. Digest entries show the triage digest title.

### Note Detail Modal
`NoteDetailModal` detects `DIGEST` artifacts via `isDigestPayload()` type guard. Renders 3 collapsible sections (ACTION_REQUIRED, READ_ONLY, NOISE) with message content, author, channel, and permalink links.

### Mentions Workspace
Route: `/dashboard/mentions`

- Server page loads Slack connection state, Quiet Mode state, pending queue count, and recent `SCHEDULED_DIGEST` runs
- Recent digest artifact payloads are flattened into individual mention cards for the list view
- `MentionsBoard` provides client-side search, category filters, queue/process status, and a manual process button wired to `POST /api/user/triage/trigger`
- `MentionDetailPanel` opens as a right-side panel via `?mention=<messageId>` and shows the AI reason, source context, permalink, and digest delivery status
- `mention-display.ts` centralizes category metadata, source metadata, Slack text cleanup, mention titles, previews, and search matching

## Rate Limiting & Data Controls

| Control | Value | Implemented In |
|---------|-------|----------------|
| Per-message content | Truncated to 1,000 chars | `triage-classification.ts` |
| Total LLM payload | Max 30,000 chars | `triage-classification.ts` |
| Messages per batch | Max 50 | `triage-classification.ts` |
| LLM response tokens | Max 2,048 | `process-digest.ts` |
| OpenRouter 429 retry | 3 attempts, exponential backoff | `openrouter-client.ts` |
| OpenRouter 502/503 retry | 3 attempts, exponential backoff | `openrouter-client.ts` |
| Slack search results | Max 100 per sync | `fetch-mentions.ts` |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/workflows/process-digest.ts` | Shared digest processing (LLM → format → deliver) |
| `src/lib/sources/slack/fetch-mentions.ts` | Pull-based `search.messages` fetcher |
| `src/lib/sources/slack/verify-signature.ts` | HMAC-SHA256 webhook verification |
| `src/lib/sources/slack/slack-source-provider.ts` | SourceProviderContract implementation |
| `src/lib/ai/prompts/triage-classification.ts` | LLM prompt, Zod schema, content truncation |
| `src/lib/destinations/triage-formatter.ts` | Block Kit + markdown digest formatters |
| `src/app/api/webhooks/connectors/[connectorId]/route.ts` | Webhook ingestion endpoint |
| `src/app/api/user/triage/trigger/route.ts` | Manual sync trigger endpoint |
| `src/app/api/cron/process-triage-digest/route.ts` | Cron batch processor |
| `src/app/api/auth/slack/route.ts` | Slack OAuth V2 initiation |
| `src/app/api/auth/slack/callback/route.ts` | Slack OAuth V2 callback |
| `src/app/dashboard/mentions/page.tsx` | Mentions workspace server page that loads queue state and recent digest runs |
| `src/components/dashboard/mentions-board.tsx` | Mentions list UI with search, category filters, and process action |
| `src/components/dashboard/mention-detail-panel.tsx` | Right-side detail panel for individual triaged mentions |
| `src/lib/utils/mention-display.ts` | Mention formatting/search/category helpers used by the Mentions workspace |

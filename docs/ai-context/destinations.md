# Destination Architecture

## Overview

Nexus uses an **additive delivery model**: every artifact is always stored in Nexus History (the database). Additional destinations (Slack DM, ClickUp Docs) are independent toggles that the user enables via `DestinationConnection` records.

## Provider Contract

Defined in `src/lib/destinations/types.ts`:

```typescript
interface DestinationProviderContract {
  readonly provider: DestinationProvider;
  validateConfig(config: DestinationConfig): boolean;
  deliver(artifact: ArtifactForDelivery, config: DestinationConfig, userId: string): Promise<DeliveryResult>;
}
```

All providers receive a canonical `ArtifactForDelivery` object — they are artifact-type agnostic. Both MEETING_SUMMARY and DIGEST artifacts flow through the same delivery path.

## Delivery Planner

`src/lib/destinations/planner.ts` — `deliverArtifact(artifact, userId)`:

1. Always delivers to **NEXUS_HISTORY** first (no-op — artifact already persisted)
2. Queries `getEnabledDestinationConnections(userId)` for all CONNECTED + enabled destinations
3. For each destination: calls `provider.deliver()`, creates `ArtifactDelivery` record with status
4. Returns delivery results array

## Providers

### Nexus History (`nexus-history.ts`)
- No-op deliver — artifact is already in the database
- Always validates

### Slack DM (`slack-provider.ts`)
- Reads `externalAccountId` (Slack user ID) from `DestinationConnection`
- Uses `SLACK_BOT_TOKEN` env var (not per-user token) to send messages
- Formats via `slack-formatter.ts` (meeting summaries) or uses pre-formatted blocks from `triage-formatter.ts` (digests)
- Retry: 2 attempts on `ratelimited` or `timeout` errors

### ClickUp Docs (`clickup-provider.ts`)
- Reads OAuth tokens from `oauthTokensEncrypted` (per-user)
- Reads workspace/space/folder config from `configJson`
- Finds or creates a "Meeting Summaries" doc in the configured space/folder
- Adds a new page per artifact using markdown from `markdown-formatter.ts`
- Returns `externalUrl` linking to the ClickUp doc

## Formatters

| File | Purpose | Used By |
|------|---------|---------|
| `slack-formatter.ts` | Meeting summary → Slack Block Kit | SlackDestinationProvider |
| `triage-formatter.ts` | Classified messages → Block Kit digest + markdown | process-digest workflow |
| `markdown-formatter.ts` | Meeting summary → markdown | ClickUpDestinationProvider |

## Adding a New Destination

1. Create provider implementing `DestinationProviderContract`
2. Register in planner's provider map (`src/lib/destinations/planner.ts`)
3. Add OAuth routes in `api/auth/<name>/` (if needed)
4. Add `DestinationProvider` enum value in Prisma schema
5. Create `DestinationConnection` record for the user

No changes needed to the processing pipeline, queue, or workflow handlers.

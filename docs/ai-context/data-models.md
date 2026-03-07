# Data Models (Prisma)

All models are defined in `prisma/schema.prisma`. Generated client at `src/generated/prisma/`.

## Enums

| Enum | Values |
|------|--------|
| `SourceProvider` | GOOGLE_DRIVE, SLACK |
| `DestinationProvider` | NEXUS_HISTORY, SLACK, CLICKUP |
| `ConnectionStatus` | CONNECTED, DISCONNECTED, EXPIRED, ERROR |
| `SourceEventStatus` | RECEIVED, PROCESSING, PROCESSED, FAILED |
| `WorkflowType` | MEETING_SUMMARY, SCHEDULED_DIGEST |
| `ArtifactType` | MEETING_SUMMARY, DIGEST |
| `RunStatus` | PENDING, PROCESSING, COMPLETED, FAILED |
| `DeliveryStatus` | PENDING, DELIVERED, FAILED |
| `OnboardingStep` | CONNECT_WORKSPACE, CONFIGURE_WORKFLOWS |

## Core Models

### User
NextAuth user with accounts, sessions. Central identity.

### UserConfig
Per-user settings. One-to-one with User.

| Field | Type | Purpose |
|-------|------|---------|
| `meetingSummariesEnabled` | Boolean | Auto-process toggle for transcripts |
| `quietModeEnabled` | Boolean | Omnichannel triage toggle |
| `digestSchedule` | Json? | Delivery times/timezone for digests |
| `dismissedConnectorNudge` | Boolean | Hides ClickUp promo card |
| `encryptedOpenRouterKey` | String? | BYOK API key (AES-256-GCM) |
| `customSystemPrompt` | String? | Custom meeting summary prompt |
| `onboardingStep` | OnboardingStep | Current first-run onboarding step |
| `onboardingCompletedAt` | DateTime? | Null while onboarding is required; set when completed or skipped |

### SourceConnection
Per-user source integration. Unique on `(userId, provider)`.

| Field | Type | Purpose |
|-------|------|---------|
| `provider` | SourceProvider | GOOGLE_DRIVE or SLACK |
| `status` | ConnectionStatus | Current connection state |
| `configJson` | Json? | Provider-specific config (e.g. `drivePageToken`, `teamId`) |
| `externalAccountId` | String? | External user ID |

### DestinationConnection
Per-user destination integration. Unique on `(userId, provider)`.

| Field | Type | Purpose |
|-------|------|---------|
| `provider` | DestinationProvider | NEXUS_HISTORY, SLACK, or CLICKUP |
| `status` | ConnectionStatus | Current connection state |
| `enabled` | Boolean | Whether delivery is active |
| `configJson` | Json? | Provider config (e.g. ClickUp workspace/space/folder IDs) |
| `oauthTokensEncrypted` | String? | AES-encrypted OAuth tokens (Slack user token, ClickUp access/refresh tokens) |
| `externalAccountId` | String? | External user ID (e.g. Slack user ID) |

### PushChannel
Google Drive watch channel.

| Field | Type | Purpose |
|-------|------|---------|
| `channelId` | String | Google-assigned channel ID |
| `resourceId` | String | Google-assigned resource ID |
| `expiration` | DateTime | When the watch expires |

### SourceEvent
Inbound webhook events. Has `dedupeKey` for idempotency.

| Field | Type | Purpose |
|-------|------|---------|
| `eventType` | String | Event type (e.g. "sync", "app_mention") |
| `dedupeKey` | String | Unique key for deduplication |
| `rawPayload` | Json? | Full webhook payload |
| `status` | SourceEventStatus | RECEIVED → PROCESSING → PROCESSED/FAILED |

### SourceItem
Individual items extracted from source events. Unique on `(sourceConnectionId, externalItemId)`.

| Field | Type | Purpose |
|-------|------|---------|
| `externalItemId` | String | External ID (e.g. Drive file ID) |
| `title` | String? | Item title |
| `sourceUrl` | String? | Link to source |

### PendingNotification
Omnichannel triage queue. Unique on `(userId, connectorId, externalMessageId)`. Records are deleted after processing.

| Field | Type | Purpose |
|-------|------|---------|
| `connectorId` | String | Source connector (e.g. "slack") |
| `externalMessageId` | String | Unique message ID from source |
| `authorName` | String | Who sent the message |
| `content` | String (Text) | Message text |
| `metadata` | Json? | Channel, timestamp, permalink, etc. |

### WorkflowRun
Processing run lifecycle.

| Field | Type | Purpose |
|-------|------|---------|
| `workflowType` | WorkflowType | MEETING_SUMMARY or SCHEDULED_DIGEST |
| `triggerType` | String | How it was triggered (WEBHOOK, MANUAL, CRON) |
| `status` | RunStatus | PENDING → PROCESSING → COMPLETED/FAILED |
| `inputRefJson` | Json? | Input references (file IDs, notification counts) |
| `modelUsed` | String? | LLM model used |
| `errorMessage` | String? | Error details if failed |
| `metricsJson` | Json? | Processing metrics |

### Artifact
Output of a workflow run.

| Field | Type | Purpose |
|-------|------|---------|
| `artifactType` | ArtifactType | MEETING_SUMMARY or DIGEST |
| `title` | String | Display title |
| `summaryText` | String? (Text) | Plain text / markdown content |
| `payloadJson` | Json? | Structured payload (summary fields, classifications, blocks) |
| `sourceRefsJson` | Json? | References to source items |

### ArtifactDelivery
Per-destination delivery tracking.

| Field | Type | Purpose |
|-------|------|---------|
| `provider` | DestinationProvider | Target destination |
| `status` | DeliveryStatus | PENDING → DELIVERED/FAILED |
| `externalUrl` | String? | URL in destination (e.g. ClickUp doc link) |
| `retryCount` | Int | Number of retry attempts |

### FailedJob
Dead letter queue for failed async jobs (QStash).

### ChannelRenewalError
Tracks push channel renewal failures with `acknowledged` flag for alert dismissal.

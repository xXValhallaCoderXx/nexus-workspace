# Project Nexus — Implementation Plan

**Source:** nexus-prd-v1.1.md
**Created:** March 2026
**Purpose:** Checkable task list for full Phase 1 MVP implementation. Resume from any checkpoint.

---

## How to Use This Document

- Check off tasks as you complete them: change `[ ]` to `[x]`
- Tasks are ordered by dependency — complete each section top-to-bottom
- Some sections can be worked in parallel (noted where applicable)
- Each task includes enough context to be actionable without re-reading the PRD

---

## Phase 0 — Project Bootstrapping & Infrastructure

### 0.1 Repository & Next.js Setup

- [ ] Initialise Next.js project with App Router (`npx create-next-app@latest nexus --app --ts --tailwind --eslint --src-dir`)
- [ ] Configure TypeScript `tsconfig.json` — strict mode enabled, path aliases (`@/` → `src/`)
- [ ] Add `.nvmrc` with Node.js LTS version (e.g. `20`)
- [ ] Create base folder structure:
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   ├── auth/
  │   │   ├── webhooks/
  │   │   └── cron/
  │   ├── dashboard/
  │   └── layout.tsx
  ├── lib/
  │   ├── auth/
  │   ├── crypto/
  │   ├── db/
  │   ├── queue/
  │   ├── redis/
  │   ├── ai/
  │   ├── destinations/
  │   └── google/
  ├── types/
  └── components/
  ```
- [ ] Set up `.gitignore` (confirm `.env*` files are excluded)
- [ ] Initial commit and push to remote

### 0.2 Environment Variables & Secrets

- [ ] Create `.env.example` documenting all required variables (no real values):
  ```
  # Database
  DATABASE_URL=
  DIRECT_URL=

  # Auth
  NEXTAUTH_URL=
  NEXTAUTH_SECRET=
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=

  # Upstash Redis
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=

  # Upstash QStash
  QSTASH_TOKEN=
  QSTASH_CURRENT_SIGNING_KEY=
  QSTASH_NEXT_SIGNING_KEY=

  # OpenRouter
  OPENROUTER_API_KEY=

  # Encryption
  ENCRYPTION_SECRET=

  # Webhook
  WEBHOOK_BASE_URL=
  ```
- [ ] Create `.env.local` with actual development values (git-ignored)
- [ ] Generate a secure `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
- [ ] Generate a secure `ENCRYPTION_SECRET` for AES-256 (`openssl rand -hex 32` — 32 bytes = 64 hex chars)

### 0.3 External Service Accounts

- [ ] Create Google Cloud project for Nexus
- [ ] Enable Google Drive API in Cloud Console
- [ ] Create OAuth 2.0 Client ID (Web Application type)
- [ ] Configure OAuth consent screen (internal app — requires Google Workspace)
- [ ] Add authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
- [ ] Add authorised redirect URI for Vercel preview: `https://<project>.vercel.app/api/auth/callback/google`
- [ ] Create Upstash Redis database (free tier)
- [ ] Create Upstash QStash account (free tier)
- [ ] Create OpenRouter account and obtain API key
- [ ] Set up ngrok account for local webhook tunnelling

### 0.4 Database Setup

- [ ] Provision PostgreSQL instance (Vercel Postgres, Neon, Supabase, or Railway)
- [ ] Install Prisma: `npm install prisma @prisma/client`
- [ ] Initialise Prisma: `npx prisma init`
- [ ] Configure `DATABASE_URL` and `DIRECT_URL` in `.env.local`
- [ ] Confirm Prisma can connect: `npx prisma db pull` (should run without error)

### 0.5 Core Dependencies

- [ ] Install authentication: `npm install next-auth @auth/prisma-adapter`
- [ ] Install Upstash packages: `npm install @upstash/redis @upstash/qstash`
- [ ] Install Google APIs: `npm install googleapis`
- [ ] Install utility packages: `npm install zod` (runtime validation)
- [ ] Confirm `npm run build` succeeds with no errors

---

## Phase 1 — Database Schema (Prisma)

### 1.1 Core User & Auth Tables

- [ ] Define `User` model in `prisma/schema.prisma`:
  - `id` (cuid), `name`, `email` (unique), `emailVerified`, `image`
  - `createdAt`, `updatedAt`
- [ ] Define `Account` model (NextAuth adapter schema):
  - `id`, `userId`, `type`, `provider`, `providerAccountId`
  - `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`
  - Unique constraint on `[provider, providerAccountId]`
- [ ] Define `Session` model:
  - `id`, `sessionToken` (unique), `userId`, `expires`
- [ ] Define `VerificationToken` model:
  - `identifier`, `token`, `expires`
  - Unique constraint on `[identifier, token]`

### 1.2 Application-Specific Tables

- [ ] Define `UserConfig` model:
  - `id`, `userId` (unique — one config per user)
  - `encryptedOpenRouterKey` (String, nullable — stores AES-256 encrypted BYOK key)
  - `meetingSummariesEnabled` (Boolean, default false)
  - `selectedDestination` (Enum or String — e.g. `SLACK`, `DATABASE`)
  - `slackWebhookUrl` (String, nullable — encrypted at rest)
  - `createdAt`, `updatedAt`
  - Relation: belongs to `User`
- [ ] Define `PushChannel` model:
  - `id`, `userId`
  - `channelId` (String, unique — Google's channel ID)
  - `resourceId` (String — Google's resource ID)
  - `watchToken` (String — secret token for signature verification)
  - `expiration` (DateTime — channel expiry timestamp from Google)
  - `createdAt`
  - Relation: belongs to `User`
- [ ] Define `JobHistory` model:
  - `id`, `userId`
  - `workflowType` (String — e.g. `MEETING_SUMMARY`)
  - `status` (Enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)
  - `sourceFileId` (String — Google Drive file ID)
  - `sourceFileName` (String, nullable)
  - `llmModel` (String, nullable — model used)
  - `resultPayload` (Json, nullable — structured LLM output)
  - `destinationDelivered` (String, nullable — where it was sent)
  - `errorMessage` (String, nullable)
  - `createdAt`, `completedAt` (DateTime, nullable)
  - Relation: belongs to `User`
- [ ] Define `FailedJob` model (dead-letter table):
  - `id`, `userId` (nullable — may not be resolvable)
  - `jobType` (String)
  - `payload` (Json — full original payload)
  - `errorMessage` (String)
  - `attempts` (Int)
  - `createdAt`
- [ ] Define `ChannelRenewalError` model:
  - `id`, `userId`
  - `channelId` (String)
  - `errorMessage` (String)
  - `createdAt`
  - Relation: belongs to `User`

### 1.3 Schema Finalisation

- [ ] Add all necessary `@@index` annotations (e.g. `PushChannel` indexed on `expiration` for cron queries)
- [ ] Add `@@index` on `JobHistory.userId` and `JobHistory.status`
- [ ] Run initial migration: `npx prisma migrate dev --name init`
- [ ] Generate Prisma Client: `npx prisma generate`
- [ ] Create `src/lib/db/prisma.ts` — singleton Prisma client instance (prevent hot-reload connection leaks)
- [ ] Verify schema by inspecting database with `npx prisma studio`

---

## Phase 2 — Authentication (NextAuth + Google OAuth)

### 2.1 NextAuth Configuration

- [ ] Create `src/lib/auth/auth-options.ts` with NextAuth configuration
- [ ] Configure Prisma adapter: `PrismaAdapter(prisma)`
- [ ] Configure Google provider with explicit scopes:
  ```ts
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/drive.readonly",
        access_type: "offline",
        prompt: "consent",
      },
    },
  })
  ```
- [ ] Confirm `access_type: "offline"` is set (required for refresh tokens)
- [ ] Confirm `prompt: "consent"` is set (forces consent screen so refresh token is always returned)
- [ ] Add `callbacks.session` to expose `userId` and `accessToken` in the session object
- [ ] Add `callbacks.jwt` if using JWT strategy, or ensure database strategy persists `access_token` and `refresh_token` in `Account` table

### 2.2 Auth API Route

- [ ] Create `src/app/api/auth/[...nextauth]/route.ts` — single route handler for NextAuth
- [ ] Test: navigate to `/api/auth/signin` and confirm Google sign-in button appears
- [ ] Test: complete OAuth flow and confirm user record is created in database
- [ ] Test: confirm `Account` table stores `access_token`, `refresh_token`, and `scope` includes `drive.readonly`

### 2.3 Auth Utilities

- [ ] Create `src/lib/auth/get-session.ts` — server-side helper to get current session (`getServerSession`)
- [ ] Create reusable auth guard for API routes: reject with 401 if no session
- [ ] Test: protected API route returns 401 when not authenticated and 200 when authenticated

---

## Phase 3 — Security Layer

### 3.1 AES-256 Encryption Module

- [ ] Create `src/lib/crypto/encryption.ts`
- [ ] Implement `encrypt(plaintext: string): string` function:
  - Use `crypto.createCipheriv('aes-256-gcm', key, iv)`
  - Generate random 16-byte IV per encryption
  - Return format: `iv:authTag:ciphertext` (all hex-encoded)
- [ ] Implement `decrypt(encrypted: string): string` function:
  - Parse `iv:authTag:ciphertext` format
  - Use `crypto.createDecipheriv('aes-256-gcm', key, iv)`
  - Set auth tag and decrypt
- [ ] Derive key from `ENCRYPTION_SECRET` env var (ensure it's exactly 32 bytes)
- [ ] Add validation: throw if `ENCRYPTION_SECRET` is missing or wrong length
- [ ] Write unit tests for encrypt/decrypt roundtrip
- [ ] Write unit test: different plaintexts produce different ciphertexts
- [ ] Write unit test: tampering with ciphertext throws on decrypt (GCM auth tag validation)

### 3.2 Webhook Signature Verification

- [ ] Create `src/lib/google/verify-webhook.ts`
- [ ] Implement `verifyGoogleDriveWebhook(request, expectedToken)` function:
  - Extract `X-Goog-Channel-Token` header from request
  - Compare against stored `watchToken` for the channel
  - Return boolean
- [ ] Ensure timing-safe comparison is used (`crypto.timingSafeEqual`) to prevent timing attacks
- [ ] Write unit test: valid token returns true
- [ ] Write unit test: missing or invalid token returns false

### 3.3 Multi-Tenant Data Isolation

- [ ] Audit plan: document every Prisma query that will access user-scoped data
- [ ] Create `src/lib/db/scoped-queries.ts` — helper functions that always include `userId` in WHERE clause:
  - `getUserConfig(userId)`
  - `getUserPushChannels(userId)`
  - `getUserJobHistory(userId)`
  - `getFailedJobsByUser(userId)`
- [ ] Establish pattern: all data access goes through scoped query helpers, never raw `prisma.model.findMany()` without userId

---

## Phase 4 — Google Drive Integration

### 4.1 OAuth Token Management

- [ ] Create `src/lib/google/get-drive-client.ts`
- [ ] Implement function to retrieve user's `access_token` and `refresh_token` from `Account` table
- [ ] Create authenticated `google.drive({ version: 'v3' })` client using stored tokens
- [ ] Implement token refresh logic: if `access_token` has expired, use `refresh_token` to get a new one and update the `Account` table
- [ ] Write error handling for revoked/expired refresh tokens (user must re-authenticate)

### 4.2 Push Channel Registration

- [ ] Create `src/lib/google/channel-registration.ts`
- [ ] Implement `registerPushChannel(userId: string)` function:
  - Generate unique `channelId` (UUID)
  - Generate secure random `watchToken` (for signature verification)
  - Call `drive.files.watch()` with:
    - `fileId: 'root'` (or appropriate scope)
    - `requestBody.id`: generated channelId
    - `requestBody.type`: `'web_hook'`
    - `requestBody.address`: `${WEBHOOK_BASE_URL}/api/webhooks/google-drive`
    - `requestBody.token`: generated watchToken
    - `requestBody.expiration`: current time + 7 days (max allowed)
  - Persist channel to `PushChannel` table with all fields including `expiration`
- [ ] Implement `stopChannel(channelId, resourceId)` function:
  - Call `drive.channels.stop()` to deregister the old channel
- [ ] Add error handling: if registration fails, throw descriptive error for the UI to display
- [ ] Create API endpoint to trigger channel registration on user onboarding: `src/app/api/channels/register/route.ts`
- [ ] Test: after OAuth, channel registration creates a `PushChannel` record in DB
- [ ] Test: Google Cloud Console shows the registered webhook channel

### 4.3 Transcript Fetching

- [ ] Create `src/lib/google/fetch-transcript.ts`
- [ ] Implement `fetchTranscriptContent(userId, fileId)` function:
  - Use authenticated Drive client for the user
  - Call `drive.files.get({ fileId, alt: 'media' })` to download file content
  - Call `drive.files.get({ fileId, fields: 'name,mimeType,createdTime' })` for metadata
  - Handle Google Docs format: export as plain text if mimeType is `application/vnd.google-apps.document`
  - Implement content truncation if transcript exceeds LLM context window (configurable max chars — start with 100,000)
- [ ] Add error handling for: file not found (404), permission denied (403), token expired
- [ ] Add filtering: only process files that match transcript patterns (e.g., filename contains "Transcript" or mimeType matches)

---

## Phase 5 — Redis Deduplication Layer

### 5.1 Redis Client Setup

- [ ] Create `src/lib/redis/client.ts`
- [ ] Initialise Upstash Redis client:
  ```ts
  import { Redis } from "@upstash/redis";
  export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  ```
- [ ] Add validation: throw on missing env vars at startup

### 5.2 Deduplication Logic

- [ ] Create `src/lib/redis/deduplication.ts`
- [ ] Implement `isDuplicate(resourceId: string, changeToken: string): Promise<boolean>` function:
  - Construct key: `dedup:{resourceId}:{changeToken}`
  - Use `redis.set(key, "1", { nx: true, ex: 300 })` (SETNX with 5-minute TTL)
  - If `set` returns `null` → duplicate (key already existed) → return `true`
  - If `set` returns `"OK"` → first occurrence → return `false`
- [ ] Write unit test: first call returns `false`, second call with same params returns `true`
- [ ] Write unit test: after TTL expiry, same params return `false` again

---

## Phase 6 — Task Queue (QStash)

### 6.1 QStash Client Setup

- [ ] Create `src/lib/queue/client.ts`
- [ ] Initialise QStash client:
  ```ts
  import { Client } from "@upstash/qstash";
  export const qstash = new Client({
    token: process.env.QSTASH_TOKEN!,
  });
  ```

### 6.2 Job Enqueue Function

- [ ] Create `src/lib/queue/enqueue.ts`
- [ ] Implement `enqueueTranscriptJob(payload)` function:
  - Payload includes: `userId`, `fileId`, `resourceId`, `channelId`
  - Publish to QStash targeting the worker endpoint: `${WEBHOOK_BASE_URL}/api/workers/process-transcript`
  - Configure `retries: 3` with backoff
  - Configure dead-letter callback URL: `${WEBHOOK_BASE_URL}/api/workers/dead-letter`
- [ ] Add Zod schema validation for the job payload before enqueuing
- [ ] Write unit test: enqueue function formats and sends correct payload

### 6.3 Worker Endpoint — Transcript Processing

- [ ] Create `src/app/api/workers/process-transcript/route.ts`
- [ ] Add QStash signature verification middleware (verify the request came from QStash, not an external actor):
  ```ts
  import { Receiver } from "@upstash/qstash";
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
  ```
- [ ] Parse and validate incoming job payload with Zod
- [ ] Implementation flow:
  1. Create `JobHistory` record with status `PROCESSING`
  2. Fetch transcript content from Google Drive (via `fetchTranscriptContent`)
  3. Retrieve user's config (encrypted API key, destination preference)
  4. Decrypt API key if BYOK, otherwise use global key
  5. Call OpenRouter with meeting summary prompt (Phase 7)
  6. Parse structured LLM response
  7. Deliver to user's configured destination (Phase 8)
  8. Update `JobHistory` record: status `COMPLETED`, store result payload
- [ ] Add try/catch: on failure, update `JobHistory` to `FAILED` with error message
- [ ] Test: hit worker endpoint with a mocked QStash payload, verify database records

### 6.4 Dead-Letter Handler

- [ ] Create `src/app/api/workers/dead-letter/route.ts`
- [ ] On receipt: write full payload + error details to `FailedJob` table
- [ ] Add QStash signature verification (same as worker endpoint)
- [ ] Log a warning (structured JSON log for Vercel monitoring)
- [ ] Test: simulate exhausted retries and verify `FailedJob` record is created

---

## Phase 7 — AI Processing Engine (OpenRouter)

### 7.1 OpenRouter Client

- [ ] Create `src/lib/ai/openrouter-client.ts`
- [ ] Implement `callOpenRouter(options)` function:
  - Accept: `apiKey`, `model`, `systemPrompt`, `userContent`, `responseFormat`
  - Make POST to `https://openrouter.ai/api/v1/chat/completions`
  - Set headers: `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`
  - Set `HTTP-Referer` and `X-Title` headers (OpenRouter requires these)
  - Request JSON response format for structured output
- [ ] Implement response parsing: extract `choices[0].message.content`
- [ ] Add error handling: rate limiting (429), invalid API key (401), model errors (500)
- [ ] Add timeout handling: abort if OpenRouter doesn't respond within 60 seconds

### 7.2 Meeting Summary Prompt Template

- [ ] Create `src/lib/ai/prompts/meeting-summary.ts`
- [ ] Define system prompt that instructs the LLM to output structured JSON:
  ```ts
  export const MEETING_SUMMARY_SYSTEM_PROMPT = `
  You are a meeting analyst. Given a raw meeting transcript, produce a structured JSON summary.
  
  Output the following JSON structure:
  {
    "title": "Brief meeting title",
    "date": "Meeting date if mentioned",
    "attendees": ["List of participants mentioned"],
    "summary": "2-3 paragraph executive summary",
    "actionItems": [
      { "owner": "Person name", "task": "Description", "deadline": "If mentioned" }
    ],
    "decisions": ["Key decisions made during the meeting"],
    "followUps": ["Items that need follow-up"]
  }
  
  Be concise. Only include information explicitly stated in the transcript.
  `;
  ```
- [ ] Define Zod schema for validating LLM output structure
- [ ] Add fallback handling: if LLM returns malformed JSON, retry once with a stricter prompt

### 7.3 Processing Orchestrator

- [ ] Create `src/lib/ai/process-meeting.ts`
- [ ] Implement `processMeetingTranscript(userId, fileId)` function:
  - Orchestrates: fetch transcript → get API key → call LLM → validate response → return structured result
  - Use user's BYOK key (decrypted) if `UserConfig.encryptedOpenRouterKey` is set
  - Fall back to `process.env.OPENROUTER_API_KEY` (global key) if no BYOK
  - Default model: configurable constant (e.g. `google/gemini-2.0-flash-001` or `anthropic/claude-3.5-sonnet`)
- [ ] Add Zod validation of the LLM output against the meeting summary schema
- [ ] Write integration test: mock OpenRouter response, verify parsing and validation

---

## Phase 8 — Destination System (Strategy Pattern)

### 8.1 Destination Interface

- [ ] Create `src/lib/destinations/types.ts`
- [ ] Define `DestinationProvider` interface:
  ```ts
  export interface DestinationProvider {
    deliver(payload: MeetingSummaryOutput, userId: string): Promise<DeliveryResult>;
  }

  export interface DeliveryResult {
    success: boolean;
    destinationName: string;
    externalId?: string;
    error?: string;
  }
  ```

### 8.2 Database Destination (MVP Default)

- [ ] Create `src/lib/destinations/database-provider.ts`
- [ ] Implement `DatabaseProvider` class:
  - `deliver()` writes the summary JSON to the `JobHistory.resultPayload` field
  - Always succeeds (fallback destination)
- [ ] Write unit test: delivery creates correct database record

### 8.3 Slack Destination

- [ ] Create `src/lib/destinations/slack-provider.ts`
- [ ] Implement `SlackProvider` class:
  - `deliver()` sends a formatted message to the user's configured Slack webhook URL
  - Format the meeting summary into Slack Block Kit JSON:
    - Header: meeting title
    - Section: executive summary
    - Fields: action items as a bulleted list with owners
    - Fields: decisions as a bulleted list
- [ ] Add error handling: retry once on 5xx, log on permanent failure
- [ ] Write unit test: mock Slack API, verify Block Kit payload format
- [ ] Add Slack formatting helper: `src/lib/destinations/slack-formatter.ts`

### 8.4 Destination Router

- [ ] Create `src/lib/destinations/router.ts`
- [ ] Implement `getDestinationProvider(destinationType: string): DestinationProvider`
  - Maps string enum to provider class instance
  - Default: `DatabaseProvider`
  - `"SLACK"` → `SlackProvider`
- [ ] Wire into the worker: after LLM processing, call `router.deliver(result, userId)`
- [ ] Write unit test: router returns correct provider for each destination type

---

## Phase 9 — Webhook Ingestion Route

### 9.1 Google Drive Webhook Endpoint

- [ ] Create `src/app/api/webhooks/google-drive/route.ts`
- [ ] Implement `POST` handler with the following pipeline:
  1. **Extract headers:** `X-Goog-Channel-ID`, `X-Goog-Channel-Token`, `X-Goog-Resource-ID`, `X-Goog-Resource-State`
  2. **Signature verification:** Look up `PushChannel` by `channelId`, compare `X-Goog-Channel-Token` against stored `watchToken` using timing-safe comparison. Return `401` if mismatch.
  3. **Filter event type:** Only process `X-Goog-Resource-State: change` or `update`. Ignore `sync` events (return `200` immediately).
  4. **Deduplication:** Call `isDuplicate(resourceId, changeToken)`. If duplicate, return `200` and stop.
  5. **Resolve user:** Look up `userId` from `PushChannel` record.
  6. **Check user config:** Verify `meetingSummariesEnabled === true`. If disabled, return `200` and stop.
  7. **Enqueue:** Call `enqueueTranscriptJob({ userId, fileId, resourceId, channelId })`.
  8. **Return `200`** immediately. All processing happens async.
- [ ] Implement `GET` handler: return `200` (Google may send verification pings)
- [ ] Add structured logging at each step for debugging
- [ ] Write integration test: valid webhook → job enqueued
- [ ] Write integration test: invalid token → 401 returned, no job enqueued
- [ ] Write integration test: duplicate webhook → 200 returned, no job enqueued

### 9.2 File Change Detection

- [ ] After receiving a change notification, call `drive.changes.list()` or `drive.files.list()` with appropriate filters to identify which file changed
- [ ] Filter: only process files where `mimeType` indicates a Google Doc/transcript
- [ ] Filter: optionally check filename pattern (e.g., contains "Meeting" or "Transcript")
- [ ] Pass the resolved `fileId` into the enqueue payload

---

## Phase 10 — Channel Renewal Cron Job

### 10.1 Cron Route

- [ ] Create `src/app/api/cron/renew-channels/route.ts`
- [ ] Implement `GET` handler (Vercel Cron calls GET)
- [ ] Add Vercel Cron authentication: verify `Authorization: Bearer ${CRON_SECRET}` header
- [ ] Query `PushChannel` table: find all channels where `expiration < NOW() + 24 hours`
- [ ] For each expiring channel:
  1. Get user's authenticated Drive client (refresh token if needed)
  2. Call `stopChannel()` to deregister old channel
  3. Call `registerPushChannel()` to create new channel
  4. Delete old `PushChannel` record, insert new one
  5. On failure: write to `ChannelRenewalError` table with error details
- [ ] Add structured logging: log each renewal attempt and result

### 10.2 Vercel Cron Configuration

- [ ] Create/update `vercel.json` with cron schedule:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/renew-channels",
        "schedule": "0 */6 * * *"
      }
    ]
  }
  ```
- [ ] Set `CRON_SECRET` environment variable in Vercel dashboard
- [ ] Test: manually invoke the cron endpoint and verify it queries expiring channels
- [ ] Test: create a channel with short TTL, verify renewal creates new record

---

## Phase 11 — Frontend / Dashboard UI

### 11.1 Layout & Auth UI

- [ ] Create `src/app/layout.tsx` — root layout with Tailwind, providers, metadata
- [ ] Create `src/components/providers/session-provider.tsx` — NextAuth session provider wrapper
- [ ] Create `src/app/page.tsx` — landing/login page with Google sign-in button
- [ ] Create `src/components/auth/sign-in-button.tsx`
- [ ] Create `src/components/auth/sign-out-button.tsx`
- [ ] Create `src/components/auth/user-avatar.tsx` — display user image/name from session
- [ ] Implement redirect: authenticated users go to `/dashboard`, unauthenticated to `/`

### 11.2 Dashboard Page

- [ ] Create `src/app/dashboard/page.tsx` — protected page (redirect to login if no session)
- [ ] Section 1: **Connection Status**
  - Display Google account connection status (connected/not connected)
  - Show active push channel status (active/expired/none)
  - "Reconnect" button if channel expired or missing
- [ ] Section 2: **Workflow Toggle**
  - Toggle switch: "Meeting Summaries" ON/OFF
  - Calls `PATCH /api/user/config` to update `meetingSummariesEnabled`
- [ ] Section 3: **Destination Configuration**
  - Dropdown to select destination: "Database" (default), "Slack"
  - If Slack: input field for Slack webhook URL
  - Save button calls `PATCH /api/user/config`
- [ ] Section 4: **API Key (Optional)**
  - Input field for OpenRouter API key (type: password)
  - "Save" encrypts and stores; "Clear" removes the key
  - Visual indicator: "Using your key" or "Using default key"

### 11.3 Job History Page

- [ ] Create `src/app/dashboard/history/page.tsx`
- [ ] Display table of past jobs:
  - Columns: Date, File Name, Status, Destination, Actions
  - Status badges: Pending (yellow), Processing (blue), Completed (green), Failed (red)
- [ ] "View Summary" button: expand row to show formatted meeting summary
- [ ] Pagination: show 20 jobs per page
- [ ] API route: `GET /api/user/jobs` — returns paginated job history (scoped to userId)

### 11.4 Error/Alert Display

- [ ] Create `src/app/dashboard/alerts/page.tsx` or a banner component on the dashboard
- [ ] Query `ChannelRenewalError` for current user
- [ ] Display alert banner if any renewal errors exist: "Your Google Drive connection needs attention — reconnect your account"
- [ ] Dismiss action: mark alert as acknowledged in DB

### 11.5 Dashboard API Routes

- [ ] Create `src/app/api/user/config/route.ts`:
  - `GET`: return current user config (strip encrypted fields)
  - `PATCH`: update config fields (encrypt API key before storing)
  - Both scoped to `session.user.id`
- [ ] Create `src/app/api/user/jobs/route.ts`:
  - `GET`: return paginated job history scoped to `session.user.id`
  - Query params: `page`, `limit`, `status` filter
- [ ] Create `src/app/api/user/channels/route.ts`:
  - `GET`: return active push channels for current user
  - `POST`: trigger channel re-registration
- [ ] Add auth guards on all API routes (reject 401 if no session)
- [ ] Add Zod validation on all PATCH/POST request bodies

---

## Phase 12 — Integration Testing & Validation

### 12.1 End-to-End Flow Test

- [ ] Set up ngrok tunnel: `ngrok http 3000`
- [ ] Update `WEBHOOK_BASE_URL` to ngrok URL
- [ ] Perform full OAuth flow → confirm DB records created
- [ ] Register push channel → confirm channel appears in DB and Google Cloud Console
- [ ] Upload a test Google Doc (simulating a transcript) → confirm webhook fires
- [ ] Verify: webhook → dedup check → enqueue → worker processes → LLM call → destination delivery → `JobHistory` updated
- [ ] Verify: dashboard shows completed job with summary

### 12.2 Security Tests

- [ ] Test: send webhook with missing `X-Goog-Channel-Token` → 401
- [ ] Test: send webhook with wrong token → 401
- [ ] Test: encrypt API key → store → decrypt → confirm roundtrip
- [ ] Test: access `/api/user/config` as User A → confirm User B's data is not returned
- [ ] Test: access `/api/user/jobs` as User A → confirm only User A's jobs are returned

### 12.3 Reliability Tests

- [ ] Test: send same webhook twice rapidly → only one job enqueued (dedup works)
- [ ] Test: worker fails mid-processing → job retried by QStash
- [ ] Test: worker fails 3 times → dead-letter handler writes to `FailedJob` table
- [ ] Test: create channel with 1-hour TTL → wait → cron renews it before expiry
- [ ] Test: simulate OAuth token expiry during channel renewal → `ChannelRenewalError` written

### 12.4 Unit Tests

- [ ] Set up testing framework: `npm install -D vitest @testing-library/react`
- [ ] Unit tests for encryption module (roundtrip, tamper detection)
- [ ] Unit tests for deduplication logic
- [ ] Unit tests for webhook signature verification
- [ ] Unit tests for destination router
- [ ] Unit tests for Slack message formatting
- [ ] Unit tests for meeting summary prompt / response validation

---

## Phase 13 — Deployment & Production Readiness

### 13.1 Vercel Configuration

- [ ] Connect GitHub repository to Vercel project
- [ ] Configure all environment variables in Vercel dashboard (production):
  - `DATABASE_URL`, `DIRECT_URL`
  - `NEXTAUTH_URL` (production domain)
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
  - `OPENROUTER_API_KEY`
  - `ENCRYPTION_SECRET`
  - `WEBHOOK_BASE_URL` (production URL)
  - `CRON_SECRET`
- [ ] Update Google OAuth callback URL to production domain in Cloud Console
- [ ] Run `npx prisma migrate deploy` against production database
- [ ] Deploy to Vercel: confirm build succeeds
- [ ] Verify cron job is registered in Vercel dashboard

### 13.2 Production Smoke Test

- [ ] Complete OAuth flow on production
- [ ] Verify push channel registration on production
- [ ] Upload test transcript → verify end-to-end flow on production
- [ ] Verify cron job executes on schedule (check Vercel function logs)
- [ ] Verify Upstash Redis and QStash dashboards show activity

### 13.3 Monitoring & Observability

- [ ] Confirm Vercel function logs capture structured JSON logs
- [ ] Set up Upstash Redis usage alerts (approaching free tier limits)
- [ ] Set up Upstash QStash monitoring (failure rate alerts)
- [ ] Review `FailedJob` table periodically (or set up a Slack notification for new entries)
- [ ] Review `ChannelRenewalError` table periodically

---

## Phase 14 — Documentation & Handoff

### 14.1 Developer Documentation

- [ ] Update `README.md` with:
  - Project overview and architecture diagram
  - Prerequisites (Node.js, ngrok, external accounts)
  - Setup instructions (env vars, database, OAuth)
  - Local development workflow (ngrok, test webhooks)
  - Deployment instructions
- [ ] Document folder structure and module responsibilities
- [ ] Document how to add a new destination (Strategy Pattern guide)
- [ ] Document how to add a new workflow (new webhook → prompt → destination)

### 14.2 Operational Runbook

- [ ] Document: "Channel renewal failures — how to diagnose and fix"
- [ ] Document: "Dead-letter queue — how to inspect and replay failed jobs"
- [ ] Document: "User reports missing summaries — troubleshooting checklist"
- [ ] Document: "How to rotate the ENCRYPTION_SECRET" (re-encrypt all API keys)

---

## Summary — Dependency Graph

```
Phase 0  (Bootstrap)
  └── Phase 1  (Database Schema)
        ├── Phase 2  (Authentication)  ──────────────────┐
        │     └── Phase 4  (Google Drive Integration)    │
        │           ├── Phase 9  (Webhook Route)         │
        │           └── Phase 10 (Channel Renewal Cron)  │
        ├── Phase 3  (Security Layer)                    │
        │     └── (used by Phase 4, 6, 9, 11)           │
        ├── Phase 5  (Redis Deduplication)               │
        │     └── (used by Phase 9)                      │
        ├── Phase 6  (Task Queue / QStash)               │
        │     ├── Phase 7  (AI Engine / OpenRouter)      │
        │     └── Phase 8  (Destination System)          │
        └── Phase 11 (Frontend UI) ◄─────────────────────┘
              └── Phase 12 (Testing)
                    └── Phase 13 (Deployment)
                          └── Phase 14 (Documentation)
```

**Parallelisable work:**
- Phase 3 (Security), Phase 5 (Redis), and Phase 6 (Queue) can be built in parallel after Phase 1
- Phase 7 (AI Engine) and Phase 8 (Destinations) can be built in parallel
- Phase 11 (Frontend) can start once Phase 2 (Auth) is complete and API routes are stubbed

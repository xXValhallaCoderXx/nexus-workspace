# Project Nexus — Claude Implementation Plan

**Source:** nexus-prd-v1.1.md
**Version:** 1.0
**Created:** March 2026
**Purpose:** Exhaustive, checkpoint-resumable task list for full Phase 1 MVP implementation.

---

## How to Use This Document

- Check off tasks as you complete them: change `[ ]` to `[x]`
- Tasks are ordered by dependency — complete each section top-to-bottom
- Sections marked **⚡ Parallelisable** can be done concurrently after their prerequisites
- Never skip security tasks — they are pre-conditions for any real data flowing through the system
- If resuming: scan for the first `[ ]` — that is your starting point

---

## Dependency Order (Quick Reference)

```
Phase 0  Bootstrap & Infra
  └── Phase 1  Database Schema
        ├── Phase 2  Authentication (NextAuth + Google OAuth)
        │     └── Phase 4  Google Drive Integration
        │           ├── Phase 9  Webhook Ingestion Route
        │           └── Phase 10 Channel Renewal Cron
        ├── Phase 3  Security Layer  ⚡ parallel with 2
        ├── Phase 5  Redis Dedup     ⚡ parallel with 2, 3
        ├── Phase 6  Task Queue      ⚡ parallel with 2, 3, 5
        │     ├── Phase 7  AI Engine
        │     └── Phase 8  Destination System
        └── Phase 11 Frontend UI (starts after Phase 2 + API stubs)
              └── Phase 12 Testing
                    └── Phase 13 Deployment
                          └── Phase 14 Documentation
```

---

## Phase 0 — Project Bootstrapping & Infrastructure

### 0.1 Repository & Next.js Setup

- [ ] Run: `npx create-next-app@latest nexus --app --ts --tailwind --eslint --src-dir`
  - Select: App Router ✓, TypeScript ✓, Tailwind ✓, ESLint ✓, src/ directory ✓
- [ ] Open `tsconfig.json` and verify `"strict": true` is set
- [ ] Add path alias `"@/*": ["./src/*"]` to `tsconfig.json` paths if not present
- [ ] Create `.nvmrc` in project root containing `20` (Node.js LTS)
- [ ] Create the full folder structure under `src/`:
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   ├── auth/
  │   │   │   └── [...nextauth]/
  │   │   ├── webhooks/
  │   │   │   └── google-drive/
  │   │   ├── workers/
  │   │   │   ├── process-transcript/
  │   │   │   └── dead-letter/
  │   │   ├── cron/
  │   │   │   └── renew-channels/
  │   │   ├── channels/
  │   │   │   └── register/
  │   │   └── user/
  │   │       ├── config/
  │   │       ├── jobs/
  │   │       └── channels/
  │   ├── dashboard/
  │   │   ├── history/
  │   │   └── alerts/
  │   ├── layout.tsx
  │   └── page.tsx
  ├── lib/
  │   ├── auth/
  │   ├── crypto/
  │   ├── db/
  │   ├── queue/
  │   ├── redis/
  │   ├── ai/
  │   │   └── prompts/
  │   ├── destinations/
  │   └── google/
  ├── types/
  └── components/
      ├── auth/
      ├── dashboard/
      ├── providers/
      └── ui/
  ```
- [ ] Verify `.gitignore` includes `.env`, `.env.local`, `.env*.local`
- [ ] Run `npm run build` — confirm zero errors on fresh scaffold
- [ ] Commit: `git add -A && git commit -m "chore: initialise Next.js project with App Router"`
- [ ] Push to remote: `git push -u origin main`

---

### 0.2 Environment Variables & Secrets

- [ ] Create `.env.example` in project root with the following (no real values — safe to commit):
  ```env
  # Database
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/nexus
  DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/nexus

  # Auth
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=

  # Google OAuth
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

  # Encryption (AES-256 — 32 bytes = 64 hex chars)
  ENCRYPTION_SECRET=

  # Webhook tunnel URL (ngrok or Vercel URL)
  WEBHOOK_BASE_URL=

  # Vercel Cron Auth
  CRON_SECRET=
  ```
- [ ] Create `.env.local` with real development values (git-ignored — never commit)
- [ ] Generate `NEXTAUTH_SECRET`: run `openssl rand -base64 32` and paste result into `.env.local`
- [ ] Generate `ENCRYPTION_SECRET`: run `openssl rand -hex 32` (output is 64 hex chars = 32 bytes) and paste into `.env.local`
- [ ] Generate `CRON_SECRET`: run `openssl rand -base64 32` and paste into `.env.local`
- [ ] Verify: run `git status` — confirm `.env.local` does NOT appear in tracked files

---

### 0.3 External Service Accounts

**Google Cloud:**
- [ ] Go to https://console.cloud.google.com and create a new project named `nexus`
- [ ] Enable the **Google Drive API**: APIs & Services → Library → search "Google Drive API" → Enable
- [ ] Create OAuth 2.0 Credentials: APIs & Services → Credentials → Create Credentials → OAuth client ID
  - Application type: **Web application**
  - Name: `Nexus Local`
  - Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google`
- [ ] Save `Client ID` and `Client Secret` into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Configure OAuth consent screen:
  - User type: **Internal** (if using Google Workspace) — prevents Google review requirement
  - App name: `Nexus`
  - Scopes to add: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.readonly`
- [ ] Add a second OAuth client for Vercel (repeat credential creation with production redirect URI — add after Vercel deploy)

**Upstash:**
- [ ] Create account at https://upstash.com
- [ ] Create a **Redis** database: region closest to your Vercel region, free tier
  - Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into `.env.local`
- [ ] Create a **QStash** account (same Upstash dashboard)
  - Copy `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` into `.env.local`

**OpenRouter:**
- [ ] Create account at https://openrouter.ai
- [ ] Generate API key → copy into `.env.local` as `OPENROUTER_API_KEY`
- [ ] Note: for POC, add a spending limit (e.g., $10) to prevent runaway costs

**ngrok:**
- [ ] Create account at https://ngrok.com
- [ ] Install ngrok: `brew install ngrok` (macOS) or per platform instructions
- [ ] Authenticate ngrok: `ngrok config add-authtoken YOUR_TOKEN`
- [ ] Test: `ngrok http 3000` — confirm a public HTTPS URL is generated
- [ ] Note the ngrok URL — you will use this as `WEBHOOK_BASE_URL` during local development
  - ⚠️ ngrok URLs change on each restart unless you have a paid plan — update `.env.local` each session

---

### 0.4 Database Setup

- [ ] Provision a PostgreSQL instance. Recommended options:
  - **Neon** (https://neon.tech) — free tier, serverless, Vercel-friendly
  - **Vercel Postgres** — if deploying to Vercel (easiest integration)
  - **Railway** — `railway run` CLI for local access
- [ ] Copy `DATABASE_URL` (pooled connection) and `DIRECT_URL` (direct connection — needed for Prisma migrations) into `.env.local`
  - Note: For Neon/Vercel Postgres, `DATABASE_URL` uses pgBouncer (pooled), `DIRECT_URL` uses the direct endpoint
- [ ] Install Prisma:
  ```bash
  npm install prisma @prisma/client
  ```
- [ ] Initialise Prisma:
  ```bash
  npx prisma init --datasource-provider postgresql
  ```
- [ ] Update `prisma/schema.prisma` to include `directUrl`:
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- [ ] Test connection: `npx prisma db pull` — should complete without error (empty schema is fine)

---

### 0.5 Core Dependencies

- [ ] Install authentication packages:
  ```bash
  npm install next-auth @auth/prisma-adapter
  ```
- [ ] Install Upstash packages:
  ```bash
  npm install @upstash/redis @upstash/qstash
  ```
- [ ] Install Google APIs client:
  ```bash
  npm install googleapis
  ```
- [ ] Install runtime validation:
  ```bash
  npm install zod
  ```
- [ ] Install testing framework:
  ```bash
  npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
  ```
- [ ] Create `vitest.config.ts` in project root:
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import path from 'path'

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  })
  ```
- [ ] Create `src/tests/setup.ts`:
  ```ts
  import '@testing-library/jest-dom'
  ```
- [ ] Add test script to `package.json`: `"test": "vitest"`, `"test:run": "vitest run"`
- [ ] Run `npm run build` — confirm zero errors
- [ ] Commit: `git commit -m "chore: add core dependencies and testing setup"`

---

## Phase 1 — Database Schema (Prisma)

### 1.1 Core User & Auth Tables (NextAuth Required Models)

- [ ] Open `prisma/schema.prisma` and add the `User` model:
  ```prisma
  model User {
    id            String    @id @default(cuid())
    name          String?
    email         String    @unique
    emailVerified DateTime?
    image         String?
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt

    accounts            Account[]
    sessions            Session[]
    config              UserConfig?
    pushChannels        PushChannel[]
    jobHistory          JobHistory[]
    failedJobs          FailedJob[]
    channelRenewalErrors ChannelRenewalError[]
  }
  ```
- [ ] Add the `Account` model (required by NextAuth Prisma adapter):
  ```prisma
  model Account {
    id                String  @id @default(cuid())
    userId            String
    type              String
    provider          String
    providerAccountId String
    refresh_token     String? @db.Text
    access_token      String? @db.Text
    expires_at        Int?
    token_type        String?
    scope             String?
    id_token          String? @db.Text
    session_state     String?

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([provider, providerAccountId])
    @@index([userId])
  }
  ```
- [ ] Add the `Session` model:
  ```prisma
  model Session {
    id           String   @id @default(cuid())
    sessionToken String   @unique
    userId       String
    expires      DateTime

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
  }
  ```
- [ ] Add the `VerificationToken` model:
  ```prisma
  model VerificationToken {
    identifier String
    token      String   @unique
    expires    DateTime

    @@unique([identifier, token])
  }
  ```

---

### 1.2 Application-Specific Tables

- [ ] Add the `UserConfig` model:
  ```prisma
  model UserConfig {
    id                        String   @id @default(cuid())
    userId                    String   @unique
    encryptedOpenRouterKey    String?  @db.Text
    encryptedSlackWebhookUrl  String?  @db.Text
    meetingSummariesEnabled   Boolean  @default(false)
    selectedDestination       String   @default("DATABASE")
    createdAt                 DateTime @default(now())
    updatedAt                 DateTime @updatedAt

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  ```
- [ ] Add the `PushChannel` model:
  ```prisma
  model PushChannel {
    id          String   @id @default(cuid())
    userId      String
    channelId   String   @unique
    resourceId  String
    watchToken  String
    expiration  DateTime
    createdAt   DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([expiration])
    @@index([userId])
  }
  ```
- [ ] Add the `JobHistory` model:
  ```prisma
  model JobHistory {
    id                   String    @id @default(cuid())
    userId               String
    workflowType         String    @default("MEETING_SUMMARY")
    status               JobStatus @default(PENDING)
    sourceFileId         String
    sourceFileName       String?
    llmModel             String?
    resultPayload        Json?
    destinationDelivered String?
    errorMessage         String?   @db.Text
    createdAt            DateTime  @default(now())
    completedAt          DateTime?

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
    @@index([status])
    @@index([userId, status])
    @@index([createdAt])
  }

  enum JobStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }
  ```
- [ ] Add the `FailedJob` model (dead-letter table):
  ```prisma
  model FailedJob {
    id           String   @id @default(cuid())
    userId       String?
    jobType      String
    payload      Json
    errorMessage String   @db.Text
    attempts     Int      @default(0)
    createdAt    DateTime @default(now())

    user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

    @@index([userId])
    @@index([createdAt])
  }
  ```
- [ ] Add the `ChannelRenewalError` model:
  ```prisma
  model ChannelRenewalError {
    id           String   @id @default(cuid())
    userId       String
    channelId    String
    errorMessage String   @db.Text
    acknowledged Boolean  @default(false)
    createdAt    DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
    @@index([acknowledged])
  }
  ```

---

### 1.3 Schema Finalisation & Migration

- [ ] Review full `prisma/schema.prisma` — confirm all models have correct relations and cascade deletes
- [ ] Run initial migration:
  ```bash
  npx prisma migrate dev --name init
  ```
  - Confirm: migration file is created in `prisma/migrations/`
  - Confirm: all tables are created in database
- [ ] Generate Prisma Client:
  ```bash
  npx prisma generate
  ```
- [ ] Create Prisma singleton client at `src/lib/db/prisma.ts`:
  ```ts
  import { PrismaClient } from '@prisma/client'

  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```
  - Note: The singleton pattern prevents Prisma connection pool exhaustion during Next.js hot reloads
- [ ] Verify schema visually: `npx prisma studio` — inspect all tables in browser
- [ ] Confirm: all tables are present, all columns are correct types
- [ ] Commit: `git commit -m "feat(db): add Prisma schema with all Phase 1 models"`

---

## Phase 2 — Authentication (NextAuth + Google OAuth)

### 2.1 NextAuth Configuration

- [ ] Create `src/lib/auth/auth-options.ts`:
  ```ts
  import { NextAuthOptions } from 'next-auth'
  import { PrismaAdapter } from '@auth/prisma-adapter'
  import GoogleProvider from 'next-auth/providers/google'
  import { prisma } from '@/lib/db/prisma'

  export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: [
              'openid',
              'email',
              'profile',
              'https://www.googleapis.com/auth/drive.readonly',
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      }),
    ],
    session: {
      strategy: 'database',
    },
    callbacks: {
      async session({ session, user }) {
        session.user.id = user.id
        return session
      },
    },
    pages: {
      signIn: '/',
      error: '/auth/error',
    },
  }
  ```
  - Note: `access_type: 'offline'` is required to receive a refresh token
  - Note: `prompt: 'consent'` forces the consent screen so a refresh token is always issued, even if the user previously granted access
  - Note: `strategy: 'database'` stores tokens in the `Account` table (not JWT) — this is needed so the worker can retrieve the user's access token server-side
- [ ] Extend the NextAuth types to include `user.id` on the session. Create `src/types/next-auth.d.ts`:
  ```ts
  import 'next-auth'

  declare module 'next-auth' {
    interface Session {
      user: {
        id: string
        name?: string | null
        email?: string | null
        image?: string | null
      }
    }
  }
  ```

---

### 2.2 Auth API Route

- [ ] Create `src/app/api/auth/[...nextauth]/route.ts`:
  ```ts
  import NextAuth from 'next-auth'
  import { authOptions } from '@/lib/auth/auth-options'

  const handler = NextAuth(authOptions)
  export { handler as GET, handler as POST }
  ```
- [ ] Start dev server: `npm run dev`
- [ ] Test: navigate to `http://localhost:3000/api/auth/signin`
  - Confirm: Google sign-in button appears
- [ ] Test: complete the OAuth flow with a Google account
  - Confirm: user is redirected back to the app
  - Confirm: `User` record created in DB (check via `npx prisma studio`)
  - Confirm: `Account` record created with `provider = 'google'`
  - Confirm: `Account.scope` field contains `drive.readonly`
  - Confirm: `Account.refresh_token` is NOT null (if null, `prompt: 'consent'` may not be set correctly)

---

### 2.3 Auth Utilities & Guards

- [ ] Create `src/lib/auth/get-session.ts`:
  ```ts
  import { getServerSession } from 'next-auth'
  import { authOptions } from '@/lib/auth/auth-options'

  export async function getSession() {
    return getServerSession(authOptions)
  }

  export async function getRequiredSession() {
    const session = await getSession()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    return session
  }
  ```
- [ ] Create `src/lib/auth/api-guard.ts` — reusable auth guard for API routes:
  ```ts
  import { NextResponse } from 'next/server'
  import { getSession } from './get-session'

  export async function withAuth<T>(
    handler: (userId: string) => Promise<T>
  ): Promise<NextResponse> {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      const result = await handler(session.user.id)
      return NextResponse.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
  ```
- [ ] Test: create a temporary `src/app/api/test-auth/route.ts` that returns the session, verify:
  - Unauthenticated request returns `401`
  - Authenticated request returns user info
- [ ] Delete the temporary test route after confirming behaviour
- [ ] Commit: `git commit -m "feat(auth): add NextAuth with Google OAuth and Drive scope"`

---

## Phase 3 — Security Layer ⚡ (Parallelisable with Phase 2)

### 3.1 AES-256-GCM Encryption Module

- [ ] Create `src/lib/crypto/encryption.ts`:
  ```ts
  import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto'

  const ALGORITHM = 'aes-256-gcm'
  const IV_LENGTH = 16
  const TAG_LENGTH = 16

  function getKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET
    if (!secret) throw new Error('ENCRYPTION_SECRET environment variable is not set')
    const key = Buffer.from(secret, 'hex')
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_SECRET must be 32 bytes (64 hex characters)')
    }
    return key
  }

  export function encrypt(plaintext: string): string {
    const key = getKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    // Format: iv:authTag:ciphertext (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  export function decrypt(encryptedString: string): string {
    const key = getKey()
    const parts = encryptedString.split(':')
    if (parts.length !== 3) throw new Error('Invalid encrypted string format')
    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  }
  ```
- [ ] Write unit tests at `src/tests/crypto/encryption.test.ts`:
  - [ ] Test: `encrypt` and `decrypt` are inverse operations (roundtrip)
  - [ ] Test: encrypting the same plaintext twice produces different ciphertexts (random IV)
  - [ ] Test: tampering with the ciphertext portion throws on decrypt (GCM auth tag fails)
  - [ ] Test: tampering with the authTag portion throws on decrypt
  - [ ] Test: passing an invalid format string throws a descriptive error
  - [ ] Test: missing `ENCRYPTION_SECRET` throws on `encrypt` and `decrypt`
- [ ] Run tests: `npm run test:run` — all should pass

---

### 3.2 Webhook Signature Verification

- [ ] Create `src/lib/google/verify-webhook.ts`:
  ```ts
  import { timingSafeEqual } from 'crypto'

  /**
   * Verifies the X-Goog-Channel-Token header against the stored watchToken
   * for a push notification channel. Uses timing-safe comparison to prevent
   * timing attacks.
   */
  export function verifyGoogleDriveWebhook(
    receivedToken: string | null | undefined,
    expectedToken: string
  ): boolean {
    if (!receivedToken) return false
    try {
      const received = Buffer.from(receivedToken, 'utf8')
      const expected = Buffer.from(expectedToken, 'utf8')
      if (received.length !== expected.length) return false
      return timingSafeEqual(received, expected)
    } catch {
      return false
    }
  }
  ```
- [ ] Write unit tests at `src/tests/google/verify-webhook.test.ts`:
  - [ ] Test: matching tokens return `true`
  - [ ] Test: non-matching tokens return `false`
  - [ ] Test: `null` token returns `false`
  - [ ] Test: `undefined` token returns `false`
  - [ ] Test: empty string token returns `false`
  - [ ] Test: tokens of different lengths return `false` without throwing
- [ ] Run tests: `npm run test:run` — all should pass

---

### 3.3 Multi-Tenant Scoped Query Helpers

- [ ] Create `src/lib/db/scoped-queries.ts`:
  ```ts
  import { prisma } from '@/lib/db/prisma'

  /**
   * IMPORTANT: All functions in this file enforce userId scoping.
   * Never call prisma.* directly in route handlers without going through
   * these helpers or explicitly including WHERE userId = userId.
   */

  export async function getUserConfig(userId: string) {
    return prisma.userConfig.findUnique({
      where: { userId },
    })
  }

  export async function upsertUserConfig(
    userId: string,
    data: Partial<{
      encryptedOpenRouterKey: string | null
      encryptedSlackWebhookUrl: string | null
      meetingSummariesEnabled: boolean
      selectedDestination: string
    }>
  ) {
    return prisma.userConfig.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  }

  export async function getUserPushChannels(userId: string) {
    return prisma.pushChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  export async function getPushChannelByChannelId(channelId: string) {
    return prisma.pushChannel.findUnique({
      where: { channelId },
    })
  }

  export async function getUserJobHistory(
    userId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ) {
    const { page = 1, limit = 20, status } = options
    const skip = (page - 1) * limit
    const [jobs, total] = await Promise.all([
      prisma.jobHistory.findMany({
        where: { userId, ...(status ? { status: status as any } : {}) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.jobHistory.count({
        where: { userId, ...(status ? { status: status as any } : {}) },
      }),
    ])
    return { jobs, total, page, limit, pages: Math.ceil(total / limit) }
  }

  export async function getUserChannelRenewalErrors(userId: string) {
    return prisma.channelRenewalError.findMany({
      where: { userId, acknowledged: false },
      orderBy: { createdAt: 'desc' },
    })
  }

  export async function acknowledgeChannelRenewalError(id: string, userId: string) {
    return prisma.channelRenewalError.updateMany({
      where: { id, userId },
      data: { acknowledged: true },
    })
  }
  ```
- [ ] Document rule in a code comment: all user-data access must go through scoped helpers
- [ ] Commit: `git commit -m "feat(security): add encryption module, webhook verification, and scoped queries"`

---

## Phase 4 — Google Drive Integration

### 4.1 OAuth Token Management

- [ ] Create `src/lib/google/get-drive-client.ts`:
  ```ts
  import { google } from 'googleapis'
  import { prisma } from '@/lib/db/prisma'

  export async function getDriveClient(userId: string) {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    })

    if (!account) {
      throw new Error(`No Google account linked for user ${userId}`)
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    )

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    })

    // Auto-refresh handler: update stored tokens when OAuth refreshes them
    oauth2Client.on('tokens', async (tokens) => {
      await prisma.account.updateMany({
        where: { userId, provider: 'google' },
        data: {
          access_token: tokens.access_token ?? account.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
        },
      })
    })

    return google.drive({ version: 'v3', auth: oauth2Client })
  }
  ```
  - Note: the `tokens` event fires automatically when `googleapis` refreshes an expired access token
  - Note: if `refresh_token` is null, the user must re-authenticate — catch the error upstream

---

### 4.2 Push Channel Registration

- [ ] Create `src/lib/google/channel-registration.ts`:
  ```ts
  import { randomUUID, randomBytes } from 'crypto'
  import { getDriveClient } from './get-drive-client'
  import { prisma } from '@/lib/db/prisma'

  export async function registerPushChannel(userId: string): Promise<void> {
    const drive = await getDriveClient(userId)
    const channelId = randomUUID()
    const watchToken = randomBytes(32).toString('hex')
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/google-drive`

    const response = await drive.files.watch({
      fileId: 'root',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: watchToken,
        // Max TTL is 7 days; Google may return a shorter value
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    if (!response.data.expiration) {
      throw new Error('Google Drive did not return channel expiration timestamp')
    }

    await prisma.pushChannel.create({
      data: {
        userId,
        channelId,
        resourceId: response.data.resourceId ?? '',
        watchToken,
        expiration: new Date(Number(response.data.expiration)),
      },
    })
  }

  export async function stopChannel(
    channelId: string,
    resourceId: string,
    userId: string
  ): Promise<void> {
    const drive = await getDriveClient(userId)
    await drive.channels.stop({
      requestBody: { id: channelId, resourceId },
    })
  }
  ```
- [ ] Create `src/app/api/channels/register/route.ts`:
  ```ts
  import { NextResponse } from 'next/server'
  import { withAuth } from '@/lib/auth/api-guard'
  import { registerPushChannel } from '@/lib/google/channel-registration'

  export async function POST() {
    return withAuth(async (userId) => {
      await registerPushChannel(userId)
      return { success: true, message: 'Push channel registered successfully' }
    })
  }
  ```
- [ ] Manual test: call `POST /api/channels/register` while authenticated
  - Confirm: `PushChannel` record created in DB with all fields populated
  - Confirm: `expiration` is ~7 days from now
  - Confirm: Google Cloud Console → APIs → Google Drive API → Push Notifications shows the channel (note: may take a few minutes)

---

### 4.3 Transcript Fetching

- [ ] Create `src/lib/google/fetch-transcript.ts`:
  ```ts
  import { getDriveClient } from './get-drive-client'

  const MAX_CONTENT_LENGTH = 100_000 // characters

  export interface TranscriptContent {
    fileId: string
    fileName: string
    mimeType: string
    content: string
    truncated: boolean
    createdTime: string | null
  }

  export async function fetchTranscriptContent(
    userId: string,
    fileId: string
  ): Promise<TranscriptContent> {
    const drive = await getDriveClient(userId)

    // Fetch metadata
    const metaResponse = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,createdTime',
    })
    const { name, mimeType, createdTime } = metaResponse.data

    let content: string

    if (mimeType === 'application/vnd.google-apps.document') {
      // Export Google Doc as plain text
      const exportResponse = await drive.files.export(
        { fileId, mimeType: 'text/plain' },
        { responseType: 'text' }
      )
      content = exportResponse.data as string
    } else {
      // Download raw file content (e.g., .txt, .vtt)
      const downloadResponse = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' }
      )
      content = downloadResponse.data as string
    }

    const truncated = content.length > MAX_CONTENT_LENGTH
    if (truncated) {
      content = content.slice(0, MAX_CONTENT_LENGTH)
    }

    return {
      fileId,
      fileName: name ?? 'Unknown',
      mimeType: mimeType ?? 'unknown',
      content,
      truncated,
      createdTime: createdTime ?? null,
    }
  }

  export function isLikelyTranscript(fileName: string, mimeType: string): boolean {
    const nameMatch = /transcript|meeting|meet|recording/i.test(fileName)
    const typeMatch = [
      'application/vnd.google-apps.document',
      'text/plain',
      'text/vtt',
    ].includes(mimeType)
    return nameMatch || typeMatch
  }
  ```
- [ ] Add error handling considerations (these should be caught in the worker):
  - `404` → file not found (log and skip)
  - `403` → permission denied (may need broader scope — log error)
  - `401` → token expired (trigger token refresh or flag user for re-auth)
- [ ] Commit: `git commit -m "feat(google): add Drive client, channel registration, and transcript fetching"`

---

## Phase 5 — Redis Deduplication Layer ⚡ (Parallelisable)

### 5.1 Redis Client

- [ ] Create `src/lib/redis/client.ts`:
  ```ts
  import { Redis } from '@upstash/redis'

  if (!process.env.UPSTASH_REDIS_REST_URL) {
    throw new Error('UPSTASH_REDIS_REST_URL environment variable is not set')
  }
  if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_TOKEN environment variable is not set')
  }

  export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  ```

---

### 5.2 Deduplication Logic

- [ ] Create `src/lib/redis/deduplication.ts`:
  ```ts
  import { redis } from './client'

  const DEDUP_TTL_SECONDS = 300 // 5 minutes

  /**
   * Returns true if this is a duplicate (already seen within TTL window).
   * Returns false if this is the first occurrence (and marks it as seen).
   *
   * Uses Redis SET NX (set-if-not-exists) — atomic, no race conditions.
   */
  export async function isDuplicate(
    resourceId: string,
    changeToken: string
  ): Promise<boolean> {
    const key = `dedup:${resourceId}:${changeToken}`
    // Returns "OK" if set, null if key already existed
    const result = await redis.set(key, '1', {
      nx: true,
      ex: DEDUP_TTL_SECONDS,
    })
    return result === null // null = key existed = duplicate
  }
  ```
- [ ] Write unit tests at `src/tests/redis/deduplication.test.ts`:
  - [ ] Test: first call with new resourceId/changeToken returns `false` (not a duplicate)
  - [ ] Test: second call with same params returns `true` (is a duplicate)
  - [ ] Test: calls with different resourceId return `false` each
  - [ ] Test: calls with different changeToken return `false` each
  - Note: unit tests for Redis should mock the `redis.set` call to avoid real network calls
- [ ] Commit: `git commit -m "feat(redis): add Upstash Redis client and deduplication module"`

---

## Phase 6 — Task Queue (QStash) ⚡ (Parallelisable)

### 6.1 QStash Client

- [ ] Create `src/lib/queue/client.ts`:
  ```ts
  import { Client } from '@upstash/qstash'

  if (!process.env.QSTASH_TOKEN) {
    throw new Error('QSTASH_TOKEN environment variable is not set')
  }

  export const qstash = new Client({
    token: process.env.QSTASH_TOKEN,
  })
  ```

---

### 6.2 Job Types & Payload Schemas

- [ ] Create `src/lib/queue/schemas.ts`:
  ```ts
  import { z } from 'zod'

  export const TranscriptJobSchema = z.object({
    userId: z.string().min(1),
    fileId: z.string().min(1),
    resourceId: z.string().min(1),
    channelId: z.string().min(1),
    jobHistoryId: z.string().optional(), // set after JobHistory record is created
  })

  export type TranscriptJob = z.infer<typeof TranscriptJobSchema>
  ```

---

### 6.3 Enqueue Function

- [ ] Create `src/lib/queue/enqueue.ts`:
  ```ts
  import { qstash } from './client'
  import { TranscriptJobSchema, type TranscriptJob } from './schemas'

  const WORKER_ENDPOINT = `${process.env.WEBHOOK_BASE_URL}/api/workers/process-transcript`
  const DEAD_LETTER_ENDPOINT = `${process.env.WEBHOOK_BASE_URL}/api/workers/dead-letter`

  export async function enqueueTranscriptJob(payload: TranscriptJob): Promise<void> {
    // Validate payload before enqueuing
    const validated = TranscriptJobSchema.parse(payload)

    await qstash.publishJSON({
      url: WORKER_ENDPOINT,
      body: validated,
      retries: 3,
      // QStash will call this URL if all retries are exhausted
      failureCallback: DEAD_LETTER_ENDPOINT,
    })
  }
  ```

---

### 6.4 Worker Endpoint — Transcript Processing

- [ ] Create `src/app/api/workers/process-transcript/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { Receiver } from '@upstash/qstash'
  import { TranscriptJobSchema } from '@/lib/queue/schemas'
  import { prisma } from '@/lib/db/prisma'
  import { fetchTranscriptContent, isLikelyTranscript } from '@/lib/google/fetch-transcript'
  import { getUserConfig } from '@/lib/db/scoped-queries'
  import { decrypt } from '@/lib/crypto/encryption'
  import { processMeetingTranscript } from '@/lib/ai/process-meeting'
  import { getDestinationProvider } from '@/lib/destinations/router'

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  export async function POST(req: NextRequest) {
    // 1. Verify request came from QStash (not an external actor)
    const signature = req.headers.get('upstash-signature')
    const bodyText = await req.text()

    try {
      await receiver.verify({
        signature: signature ?? '',
        body: bodyText,
        clockTolerance: 5,
      })
    } catch {
      return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
    }

    // 2. Parse and validate payload
    let payload: ReturnType<typeof TranscriptJobSchema.parse>
    try {
      payload = TranscriptJobSchema.parse(JSON.parse(bodyText))
    } catch (err) {
      console.error('[worker] Invalid payload', err)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { userId, fileId, channelId } = payload

    // 3. Create JobHistory record
    const job = await prisma.jobHistory.create({
      data: {
        userId,
        workflowType: 'MEETING_SUMMARY',
        status: 'PROCESSING',
        sourceFileId: fileId,
      },
    })

    try {
      // 4. Fetch transcript from Google Drive
      const transcript = await fetchTranscriptContent(userId, fileId)

      if (!isLikelyTranscript(transcript.fileName, transcript.mimeType)) {
        await prisma.jobHistory.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: `File "${transcript.fileName}" does not appear to be a transcript`,
            completedAt: new Date(),
          },
        })
        return NextResponse.json({ skipped: true })
      }

      // Update job with filename
      await prisma.jobHistory.update({
        where: { id: job.id },
        data: { sourceFileName: transcript.fileName },
      })

      // 5. Get user config and API key
      const config = await getUserConfig(userId)
      const apiKey = config?.encryptedOpenRouterKey
        ? decrypt(config.encryptedOpenRouterKey)
        : process.env.OPENROUTER_API_KEY!

      // 6. Call OpenRouter LLM
      const summary = await processMeetingTranscript({
        apiKey,
        transcriptContent: transcript.content,
        fileName: transcript.fileName,
      })

      // 7. Deliver to destination
      const destination = config?.selectedDestination ?? 'DATABASE'
      const destinationConfig = {
        slackWebhookUrl: config?.encryptedSlackWebhookUrl
          ? decrypt(config.encryptedSlackWebhookUrl)
          : undefined,
      }
      const provider = getDestinationProvider(destination, destinationConfig)
      const deliveryResult = await provider.deliver(summary, userId)

      // 8. Update JobHistory to COMPLETED
      await prisma.jobHistory.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          resultPayload: summary as any,
          destinationDelivered: deliveryResult.destinationName,
          llmModel: summary.modelUsed,
          completedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[worker] Job ${job.id} failed:`, errorMessage)

      await prisma.jobHistory.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage,
          completedAt: new Date(),
        },
      })

      // Re-throw so QStash knows to retry
      throw err
    }
  }
  ```

---

### 6.5 Dead-Letter Handler

- [ ] Create `src/app/api/workers/dead-letter/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { Receiver } from '@upstash/qstash'
  import { prisma } from '@/lib/db/prisma'

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  export async function POST(req: NextRequest) {
    const signature = req.headers.get('upstash-signature')
    const bodyText = await req.text()

    try {
      await receiver.verify({ signature: signature ?? '', body: bodyText, clockTolerance: 5 })
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(bodyText)
    } catch {
      payload = { raw: bodyText }
    }

    // Extract userId from payload if possible
    const userId =
      typeof payload === 'object' && payload !== null && 'userId' in payload
        ? String((payload as any).userId)
        : null

    const errorMessage =
      req.headers.get('upstash-failure-reason') ?? 'Max retries exhausted'

    await prisma.failedJob.create({
      data: {
        userId,
        jobType: 'TRANSCRIPT_PROCESSING',
        payload: payload as any,
        errorMessage,
        attempts: 3,
      },
    })

    console.error('[dead-letter] Job written to failed_jobs table', {
      userId,
      errorMessage,
    })

    return NextResponse.json({ received: true })
  }
  ```
- [ ] Commit: `git commit -m "feat(queue): add QStash client, enqueue function, worker, and dead-letter handler"`

---

## Phase 7 — AI Processing Engine (OpenRouter)

### 7.1 OpenRouter Client

- [ ] Create `src/lib/ai/openrouter-client.ts`:
  ```ts
  import { z } from 'zod'

  const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
  const REQUEST_TIMEOUT_MS = 60_000

  export interface OpenRouterOptions {
    apiKey: string
    model: string
    systemPrompt: string
    userContent: string
  }

  export async function callOpenRouter(options: OpenRouterOptions): Promise<string> {
    const { apiKey, model, systemPrompt, userContent } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.WEBHOOK_BASE_URL ?? 'https://nexus.internal',
          'X-Title': 'Nexus AI Platform',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) throw new Error('OpenRouter returned empty response')
      return content
    } finally {
      clearTimeout(timeoutId)
    }
  }
  ```

---

### 7.2 Meeting Summary Prompt & Schema

- [ ] Create `src/lib/ai/prompts/meeting-summary.ts`:
  ```ts
  export const MEETING_SUMMARY_SYSTEM_PROMPT = `
  You are a meeting analyst assistant. Your job is to process raw meeting transcripts and produce structured, actionable summaries.

  Given a meeting transcript, you MUST respond with ONLY a valid JSON object in the following exact structure:

  {
    "title": "A concise 5-10 word title describing the meeting",
    "date": "The meeting date in ISO format if mentioned, otherwise null",
    "attendees": ["Full name or handle of each participant mentioned"],
    "summary": "A 2-3 paragraph executive summary covering the main topics discussed",
    "actionItems": [
      {
        "owner": "Person responsible (null if unassigned)",
        "task": "Clear description of what needs to be done",
        "deadline": "Deadline if mentioned, otherwise null"
      }
    ],
    "decisions": ["Each significant decision made, as a complete sentence"],
    "followUps": ["Items that need follow-up but are not assigned action items"]
  }

  Rules:
  - Only include information explicitly stated in the transcript
  - If a section has no content, use an empty array [] or null as appropriate
  - Do not invent or infer information not present in the transcript
  - Respond with ONLY the JSON object — no markdown, no explanation
  `
  ```
- [ ] Create `src/lib/ai/schemas/meeting-summary-schema.ts`:
  ```ts
  import { z } from 'zod'

  export const ActionItemSchema = z.object({
    owner: z.string().nullable(),
    task: z.string(),
    deadline: z.string().nullable(),
  })

  export const MeetingSummarySchema = z.object({
    title: z.string(),
    date: z.string().nullable(),
    attendees: z.array(z.string()),
    summary: z.string(),
    actionItems: z.array(ActionItemSchema),
    decisions: z.array(z.string()),
    followUps: z.array(z.string()),
  })

  export type MeetingSummaryOutput = z.infer<typeof MeetingSummarySchema> & {
    modelUsed?: string
  }
  ```

---

### 7.3 Processing Orchestrator

- [ ] Create `src/lib/ai/process-meeting.ts`:
  ```ts
  import { callOpenRouter } from './openrouter-client'
  import { MEETING_SUMMARY_SYSTEM_PROMPT } from './prompts/meeting-summary'
  import { MeetingSummarySchema, type MeetingSummaryOutput } from './schemas/meeting-summary-schema'

  // Default model — change here to update for all users
  const DEFAULT_MODEL = 'google/gemini-2.0-flash-001'

  interface ProcessOptions {
    apiKey: string
    transcriptContent: string
    fileName: string
    model?: string
  }

  export async function processMeetingTranscript(
    options: ProcessOptions
  ): Promise<MeetingSummaryOutput> {
    const { apiKey, transcriptContent, fileName, model = DEFAULT_MODEL } = options

    const userContent = `
  File name: ${fileName}

  Transcript:
  ${transcriptContent}
  `

    let rawResponse: string

    try {
      rawResponse = await callOpenRouter({
        apiKey,
        model,
        systemPrompt: MEETING_SUMMARY_SYSTEM_PROMPT,
        userContent,
      })
    } catch (err) {
      throw new Error(`LLM call failed: ${err instanceof Error ? err.message : String(err)}`)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawResponse)
    } catch {
      // If JSON is malformed, try to extract JSON block from response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON')
      }
      parsed = JSON.parse(jsonMatch[0])
    }

    const validated = MeetingSummarySchema.safeParse(parsed)
    if (!validated.success) {
      throw new Error(`LLM output failed schema validation: ${validated.error.message}`)
    }

    return { ...validated.data, modelUsed: model }
  }
  ```
- [ ] Write integration test at `src/tests/ai/process-meeting.test.ts`:
  - [ ] Test: mock `callOpenRouter` to return valid JSON → verify parsed output matches schema
  - [ ] Test: mock returns malformed JSON with JSON block buried → verify JSON extraction works
  - [ ] Test: mock returns structurally invalid JSON (missing required fields) → verify Zod error thrown
- [ ] Run tests: `npm run test:run`
- [ ] Commit: `git commit -m "feat(ai): add OpenRouter client, meeting summary prompt, and processing orchestrator"`

---

## Phase 8 — Destination System (Strategy Pattern)

### 8.1 Destination Interface

- [ ] Create `src/lib/destinations/types.ts`:
  ```ts
  import type { MeetingSummaryOutput } from '@/lib/ai/schemas/meeting-summary-schema'

  export interface DeliveryResult {
    success: boolean
    destinationName: string
    externalId?: string
    error?: string
  }

  export interface DestinationProvider {
    deliver(payload: MeetingSummaryOutput, userId: string): Promise<DeliveryResult>
  }
  ```

---

### 8.2 Database Destination (Fallback / Default)

- [ ] Create `src/lib/destinations/database-provider.ts`:
  ```ts
  import type { DestinationProvider, DeliveryResult } from './types'
  import type { MeetingSummaryOutput } from '@/lib/ai/schemas/meeting-summary-schema'

  /**
   * DatabaseProvider — stores the summary in the JobHistory resultPayload.
   * This is the default/fallback destination. The worker already writes to
   * JobHistory, so this provider is a no-op that signals success.
   */
  export class DatabaseProvider implements DestinationProvider {
    async deliver(
      _payload: MeetingSummaryOutput,
      _userId: string
    ): Promise<DeliveryResult> {
      return {
        success: true,
        destinationName: 'DATABASE',
      }
    }
  }
  ```

---

### 8.3 Slack Formatter & Provider

- [ ] Create `src/lib/destinations/slack-formatter.ts`:
  ```ts
  import type { MeetingSummaryOutput } from '@/lib/ai/schemas/meeting-summary-schema'

  export function formatMeetingSummaryForSlack(summary: MeetingSummaryOutput): object {
    const actionItemsText = summary.actionItems.length > 0
      ? summary.actionItems
          .map(item => `• *${item.owner ?? 'Unassigned'}*: ${item.task}${item.deadline ? ` _(by ${item.deadline})_` : ''}`)
          .join('\n')
      : '_No action items_'

    const decisionsText = summary.decisions.length > 0
      ? summary.decisions.map(d => `• ${d}`).join('\n')
      : '_No decisions recorded_'

    return {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `📋 ${summary.title}`, emoji: true },
        },
        summary.date
          ? { type: 'context', elements: [{ type: 'mrkdwn', text: `*Date:* ${summary.date}` }] }
          : null,
        summary.attendees.length > 0
          ? { type: 'context', elements: [{ type: 'mrkdwn', text: `*Attendees:* ${summary.attendees.join(', ')}` }] }
          : null,
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Summary*\n${summary.summary}` },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Action Items*\n${actionItemsText}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Decisions*\n${decisionsText}` },
        },
      ].filter(Boolean),
    }
  }
  ```
- [ ] Create `src/lib/destinations/slack-provider.ts`:
  ```ts
  import type { DestinationProvider, DeliveryResult } from './types'
  import type { MeetingSummaryOutput } from '@/lib/ai/schemas/meeting-summary-schema'
  import { formatMeetingSummaryForSlack } from './slack-formatter'

  export class SlackProvider implements DestinationProvider {
    constructor(private readonly webhookUrl: string) {}

    async deliver(
      payload: MeetingSummaryOutput,
      _userId: string
    ): Promise<DeliveryResult> {
      const body = formatMeetingSummaryForSlack(payload)

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Slack delivery failed (${response.status}): ${errorText}`)
      }

      return {
        success: true,
        destinationName: 'SLACK',
      }
    }
  }
  ```

---

### 8.4 Destination Router

- [ ] Create `src/lib/destinations/router.ts`:
  ```ts
  import type { DestinationProvider } from './types'
  import { DatabaseProvider } from './database-provider'
  import { SlackProvider } from './slack-provider'

  interface DestinationConfig {
    slackWebhookUrl?: string
  }

  export function getDestinationProvider(
    destinationType: string,
    config: DestinationConfig = {}
  ): DestinationProvider {
    switch (destinationType) {
      case 'SLACK':
        if (!config.slackWebhookUrl) {
          console.warn('[router] SLACK destination selected but no webhook URL configured — falling back to DATABASE')
          return new DatabaseProvider()
        }
        return new SlackProvider(config.slackWebhookUrl)
      case 'DATABASE':
      default:
        return new DatabaseProvider()
    }
  }
  ```
- [ ] Write unit tests at `src/tests/destinations/router.test.ts`:
  - [ ] Test: `'DATABASE'` returns `DatabaseProvider` instance
  - [ ] Test: `'SLACK'` with webhook URL returns `SlackProvider` instance
  - [ ] Test: `'SLACK'` without webhook URL falls back to `DatabaseProvider`
  - [ ] Test: unknown destination type falls back to `DatabaseProvider`
- [ ] Write unit tests at `src/tests/destinations/slack-formatter.test.ts`:
  - [ ] Test: summary with action items formats owners and tasks correctly
  - [ ] Test: summary with no action items shows `_No action items_`
  - [ ] Test: summary with no decisions shows `_No decisions recorded_`
  - [ ] Test: null date and attendees blocks are filtered out from Block Kit
- [ ] Run tests: `npm run test:run`
- [ ] Commit: `git commit -m "feat(destinations): add database, Slack providers, and destination router"`

---

## Phase 9 — Webhook Ingestion Route

### 9.1 Google Drive Webhook Endpoint

- [ ] Create `src/app/api/webhooks/google-drive/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { verifyGoogleDriveWebhook } from '@/lib/google/verify-webhook'
  import { isDuplicate } from '@/lib/redis/deduplication'
  import { enqueueTranscriptJob } from '@/lib/queue/enqueue'
  import { getPushChannelByChannelId, getUserConfig } from '@/lib/db/scoped-queries'
  import { getDriveClient } from '@/lib/google/get-drive-client'

  export async function POST(req: NextRequest) {
    const channelId = req.headers.get('x-goog-channel-id')
    const channelToken = req.headers.get('x-goog-channel-token')
    const resourceId = req.headers.get('x-goog-resource-id')
    const resourceState = req.headers.get('x-goog-resource-state')
    const resourceUri = req.headers.get('x-goog-resource-uri')

    console.log('[webhook] Received Google Drive notification', {
      channelId,
      resourceId,
      resourceState,
    })

    // Step 1: Filter sync events (Google sends a sync ping on channel registration — always return 200)
    if (resourceState === 'sync') {
      console.log('[webhook] Ignoring sync event')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Step 2: Validate required headers
    if (!channelId || !resourceId) {
      console.error('[webhook] Missing required headers')
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    // Step 3: Look up channel and verify signature
    const channel = await getPushChannelByChannelId(channelId)
    if (!channel) {
      console.warn('[webhook] Unknown channelId — ignoring', { channelId })
      // Return 200 to prevent Google from retrying — this channel is not ours
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (!verifyGoogleDriveWebhook(channelToken, channel.watchToken)) {
      console.error('[webhook] Invalid channel token — rejecting', { channelId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 4: Deduplication check
    const changeToken = req.headers.get('x-goog-changed') ?? resourceState ?? 'unknown'
    const duplicate = await isDuplicate(resourceId, `${changeToken}:${Date.now().toString().slice(0, -3)}`)
    if (duplicate) {
      console.log('[webhook] Duplicate event — dropping', { resourceId })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Step 5: Check user has the feature enabled
    const config = await getUserConfig(channel.userId)
    if (!config?.meetingSummariesEnabled) {
      console.log('[webhook] Meeting summaries disabled for user — skipping', { userId: channel.userId })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Step 6: Resolve the changed file ID from Drive changes list
    let fileId: string | null = null
    try {
      const drive = await getDriveClient(channel.userId)
      const changesResponse = await drive.changes.list({
        pageToken: await getStoredPageToken(channel.userId),
        fields: 'newStartPageToken,changes(fileId,file(name,mimeType))',
        spaces: 'drive',
      })

      const transcript = changesResponse.data.changes?.find(
        (c) => c.file && /transcript|meeting|meet/i.test(c.file.name ?? '')
      )

      if (!transcript?.fileId) {
        console.log('[webhook] No transcript file found in changes')
        return NextResponse.json({ received: true }, { status: 200 })
      }

      fileId = transcript.fileId

      // Update stored page token for next poll
      if (changesResponse.data.newStartPageToken) {
        await updateStoredPageToken(channel.userId, changesResponse.data.newStartPageToken)
      }
    } catch (err) {
      console.error('[webhook] Failed to resolve file from changes', err)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Step 7: Enqueue the job — return 200 immediately
    await enqueueTranscriptJob({
      userId: channel.userId,
      fileId,
      resourceId,
      channelId,
    })

    console.log('[webhook] Job enqueued', { userId: channel.userId, fileId })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Google requires GET handler for channel verification pings
  export async function GET() {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  // Helper: retrieve stored Drive changes page token from DB (add a field to UserConfig or separate table)
  async function getStoredPageToken(userId: string): Promise<string> {
    // TODO: store pageToken in UserConfig — for MVP, fetch start token dynamically
    const drive = await getDriveClient(userId)
    const res = await drive.changes.getStartPageToken({})
    return res.data.startPageToken ?? '1'
  }

  async function updateStoredPageToken(userId: string, token: string): Promise<void> {
    const { prisma } = await import('@/lib/db/prisma')
    await prisma.userConfig.updateMany({
      where: { userId },
      data: { drivePageToken: token } as any,
    })
  }
  ```
- [ ] Add `drivePageToken` field to `UserConfig` in Prisma schema:
  ```prisma
  drivePageToken String? // Google Drive changes page token for polling
  ```
- [ ] Run migration: `npx prisma migrate dev --name add-drive-page-token`
- [ ] Write integration tests at `src/tests/webhooks/google-drive.test.ts`:
  - [ ] Test: `sync` event returns 200 without processing
  - [ ] Test: valid token → enqueue called
  - [ ] Test: invalid/missing token → 401 returned, enqueue NOT called
  - [ ] Test: duplicate event → 200 returned, enqueue NOT called
  - [ ] Test: feature disabled → 200 returned, enqueue NOT called
  - [ ] Test: unknown channelId → 200 returned (not 401)
- [ ] Run tests: `npm run test:run`
- [ ] Commit: `git commit -m "feat(webhook): add Google Drive webhook ingestion route"`

---

## Phase 10 — Channel Renewal Cron Job

### 10.1 Cron Route

- [ ] Create `src/app/api/cron/renew-channels/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { prisma } from '@/lib/db/prisma'
  import { stopChannel, registerPushChannel } from '@/lib/google/channel-registration'

  export async function GET(req: NextRequest) {
    // Verify this is called by Vercel Cron (not an external actor)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const renewalThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    const expiringChannels = await prisma.pushChannel.findMany({
      where: {
        expiration: { lt: renewalThreshold },
      },
    })

    console.log(`[cron/renew-channels] Found ${expiringChannels.length} channels to renew`)

    const results = await Promise.allSettled(
      expiringChannels.map(async (channel) => {
        try {
          // Stop old channel
          await stopChannel(channel.channelId, channel.resourceId, channel.userId)
        } catch (err) {
          // Log but continue — old channel may have already expired
          console.warn(`[cron] Failed to stop old channel ${channel.channelId}:`, err)
        }

        // Register new channel
        await registerPushChannel(channel.userId)

        // Delete old channel record (new one is created by registerPushChannel)
        await prisma.pushChannel.delete({
          where: { id: channel.id },
        })

        console.log(`[cron] Renewed channel for user ${channel.userId}`)
      })
    )

    // Log and record any failures
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        const channel = expiringChannels[i]
        const errorMessage = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)

        console.error(`[cron] Failed to renew channel ${channel.channelId}:`, errorMessage)

        await prisma.channelRenewalError.create({
          data: {
            userId: channel.userId,
            channelId: channel.channelId,
            errorMessage,
          },
        })
      }
    }

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({
      processed: expiringChannels.length,
      succeeded,
      failed,
    })
  }
  ```

---

### 10.2 Vercel Cron Configuration

- [ ] Create `vercel.json` in project root:
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
  - Schedule: every 6 hours (at minute 0 of hours 0, 6, 12, 18)
- [ ] Add `CRON_SECRET` to Vercel environment variables (also in `.env.local` for local testing)
- [ ] Manual test: call `GET /api/cron/renew-channels` with `Authorization: Bearer {CRON_SECRET}` header
  - Confirm: endpoint responds without error
  - Confirm: channels expiring within 24h are found and processed
- [ ] Local dev test for renewal logic:
  - Create a `PushChannel` record in DB with `expiration` set to 1 hour from now
  - Invoke the cron endpoint manually
  - Confirm: old record deleted, new record created with future expiration
- [ ] Commit: `git commit -m "feat(cron): add channel renewal cron job and Vercel cron config"`

---

## Phase 11 — Frontend / Dashboard UI

### 11.1 Root Layout & Auth UI

- [ ] Update `src/app/layout.tsx` — add `SessionProvider` wrapper and base metadata:
  ```tsx
  import type { Metadata } from 'next'
  import { Inter } from 'next/font/google'
  import './globals.css'
  import { SessionProvider } from '@/components/providers/session-provider'

  const inter = Inter({ subsets: ['latin'] })

  export const metadata: Metadata = {
    title: 'Nexus — AI Automation Platform',
    description: 'Internal AI automation platform',
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <SessionProvider>{children}</SessionProvider>
        </body>
      </html>
    )
  }
  ```
- [ ] Create `src/components/providers/session-provider.tsx`:
  ```tsx
  'use client'
  import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

  export function SessionProvider({ children }: { children: React.ReactNode }) {
    return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
  }
  ```
- [ ] Create `src/app/page.tsx` — landing page with Google sign-in:
  ```tsx
  import { getSession } from '@/lib/auth/get-session'
  import { redirect } from 'next/navigation'
  import { SignInButton } from '@/components/auth/sign-in-button'

  export default async function HomePage() {
    const session = await getSession()
    if (session) redirect('/dashboard')

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="text-center space-y-6 p-8">
          <h1 className="text-4xl font-bold text-gray-900">Nexus</h1>
          <p className="text-lg text-gray-600">AI-powered meeting summaries, automatically</p>
          <SignInButton />
        </div>
      </main>
    )
  }
  ```
- [ ] Create `src/components/auth/sign-in-button.tsx`:
  ```tsx
  'use client'
  import { signIn } from 'next-auth/react'

  export function SignInButton() {
    return (
      <button
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium shadow-sm hover:shadow-md transition-shadow"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          {/* Google G logo SVG paths */}
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    )
  }
  ```
- [ ] Create `src/components/auth/sign-out-button.tsx`:
  ```tsx
  'use client'
  import { signOut } from 'next-auth/react'

  export function SignOutButton() {
    return (
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    )
  }
  ```

---

### 11.2 Dashboard Page

- [ ] Create `src/app/dashboard/page.tsx` — protected dashboard:
  ```tsx
  import { getSession } from '@/lib/auth/get-session'
  import { redirect } from 'next/navigation'
  import { getUserConfig, getUserPushChannels, getUserChannelRenewalErrors } from '@/lib/db/scoped-queries'
  import { ConnectionStatus } from '@/components/dashboard/connection-status'
  import { WorkflowConfig } from '@/components/dashboard/workflow-config'
  import { AlertBanner } from '@/components/dashboard/alert-banner'
  import { SignOutButton } from '@/components/auth/sign-out-button'

  export default async function DashboardPage() {
    const session = await getSession()
    if (!session?.user?.id) redirect('/')

    const [config, channels, errors] = await Promise.all([
      getUserConfig(session.user.id),
      getUserPushChannels(session.user.id),
      getUserChannelRenewalErrors(session.user.id),
    ])

    const activeChannel = channels[0] ?? null

    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Nexus</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <SignOutButton />
          </div>
        </header>

        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
          {errors.length > 0 && <AlertBanner errors={errors} />}
          <ConnectionStatus channel={activeChannel} />
          <WorkflowConfig config={config} />
        </div>
      </main>
    )
  }
  ```
- [ ] Create `src/components/dashboard/connection-status.tsx`:
  - Show: connected Google account status
  - Show: channel expiration date if active
  - Button: "Register Channel" (POST to `/api/channels/register`) if no active channel
  - Button: "Renew Channel" if channel expires within 24 hours
- [ ] Create `src/components/dashboard/workflow-config.tsx`:
  - Toggle: "Meeting Summaries" ON/OFF (PATCH `/api/user/config`)
  - Dropdown: select destination (Database / Slack)
  - Conditional: Slack webhook URL input (when Slack selected)
  - Input: OpenRouter API key (type=password, save/clear buttons)
  - All inputs call PATCH `/api/user/config` on submit
- [ ] Create `src/components/dashboard/alert-banner.tsx`:
  - Display: warning when `ChannelRenewalError` records exist for user
  - Button: "Reconnect Google Account" → triggers re-auth
  - Button: "Dismiss" → calls `POST /api/user/channels/acknowledge-error`

---

### 11.3 Job History Page

- [ ] Create `src/app/dashboard/history/page.tsx`:
  ```tsx
  import { getSession } from '@/lib/auth/get-session'
  import { redirect } from 'next/navigation'
  import { getUserJobHistory } from '@/lib/db/scoped-queries'

  export default async function HistoryPage({
    searchParams,
  }: {
    searchParams: { page?: string; status?: string }
  }) {
    const session = await getSession()
    if (!session?.user?.id) redirect('/')

    const page = parseInt(searchParams.page ?? '1')
    const status = searchParams.status

    const { jobs, total, pages } = await getUserJobHistory(session.user.id, {
      page,
      limit: 20,
      status,
    })

    return (
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="max-w-4xl mx-auto py-8 px-4">
          <h2 className="text-2xl font-semibold mb-6">Job History</h2>
          {/* Job table — render jobs as rows */}
          {/* Status badges, pagination */}
        </div>
      </main>
    )
  }
  ```
- [ ] Implement job table component `src/components/dashboard/job-table.tsx`:
  - Columns: Date, File Name, Status, Destination, Action
  - Status badges with colours: PENDING (yellow), PROCESSING (blue), COMPLETED (green), FAILED (red)
  - "View Summary" button: expands row inline to show formatted meeting summary JSON
  - Pagination: prev/next links with `?page=N` query params
- [ ] Add navigation link from dashboard to history page

---

### 11.4 Dashboard API Routes

- [ ] Create `src/app/api/user/config/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { z } from 'zod'
  import { withAuth } from '@/lib/auth/api-guard'
  import { getUserConfig, upsertUserConfig } from '@/lib/db/scoped-queries'
  import { encrypt, decrypt } from '@/lib/crypto/encryption'

  export async function GET() {
    return withAuth(async (userId) => {
      const config = await getUserConfig(userId)
      return {
        meetingSummariesEnabled: config?.meetingSummariesEnabled ?? false,
        selectedDestination: config?.selectedDestination ?? 'DATABASE',
        hasOpenRouterKey: !!config?.encryptedOpenRouterKey,
        hasSlackWebhook: !!config?.encryptedSlackWebhookUrl,
      }
    })
  }

  const PatchSchema = z.object({
    meetingSummariesEnabled: z.boolean().optional(),
    selectedDestination: z.enum(['DATABASE', 'SLACK']).optional(),
    openRouterKey: z.string().optional().nullable(),
    slackWebhookUrl: z.string().url().optional().nullable(),
  })

  export async function PATCH(req: NextRequest) {
    return withAuth(async (userId) => {
      const body = PatchSchema.parse(await req.json())
      const updates: Record<string, unknown> = {}

      if (body.meetingSummariesEnabled !== undefined) {
        updates.meetingSummariesEnabled = body.meetingSummariesEnabled
      }
      if (body.selectedDestination !== undefined) {
        updates.selectedDestination = body.selectedDestination
      }
      if (body.openRouterKey !== undefined) {
        updates.encryptedOpenRouterKey = body.openRouterKey
          ? encrypt(body.openRouterKey)
          : null
      }
      if (body.slackWebhookUrl !== undefined) {
        updates.encryptedSlackWebhookUrl = body.slackWebhookUrl
          ? encrypt(body.slackWebhookUrl)
          : null
      }

      await upsertUserConfig(userId, updates as any)
      return { success: true }
    })
  }
  ```
- [ ] Create `src/app/api/user/jobs/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { withAuth } from '@/lib/auth/api-guard'
  import { getUserJobHistory } from '@/lib/db/scoped-queries'

  export async function GET(req: NextRequest) {
    return withAuth(async (userId) => {
      const { searchParams } = new URL(req.url)
      const page = parseInt(searchParams.get('page') ?? '1')
      const limit = parseInt(searchParams.get('limit') ?? '20')
      const status = searchParams.get('status') ?? undefined
      return getUserJobHistory(userId, { page, limit, status })
    })
  }
  ```
- [ ] Create `src/app/api/user/channels/route.ts`:
  ```ts
  import { withAuth } from '@/lib/auth/api-guard'
  import { getUserPushChannels } from '@/lib/db/scoped-queries'
  import { registerPushChannel } from '@/lib/google/channel-registration'

  export async function GET() {
    return withAuth(async (userId) => {
      return getUserPushChannels(userId)
    })
  }

  export async function POST() {
    return withAuth(async (userId) => {
      await registerPushChannel(userId)
      return { success: true }
    })
  }
  ```
- [ ] Add auth guards to all routes — confirm 401 returned when not authenticated
- [ ] Test all API routes with a REST client (e.g., Bruno, Insomnia, curl)
- [ ] Confirm: GET `/api/user/config` returns masked config (no plaintext keys)
- [ ] Confirm: PATCH `/api/user/config` with `openRouterKey` saves encrypted value to DB
- [ ] Commit: `git commit -m "feat(ui): add dashboard, job history, and user config API routes"`

---

## Phase 12 — Integration Testing & Validation

### 12.1 End-to-End Flow Test (Local with ngrok)

- [ ] Start ngrok: `ngrok http 3000`
- [ ] Update `WEBHOOK_BASE_URL` in `.env.local` to the ngrok HTTPS URL
- [ ] Restart Next.js dev server: `npm run dev`
- [ ] **Flow step 1:** Sign in with Google → confirm `User` and `Account` records in DB
- [ ] **Flow step 2:** Call `POST /api/channels/register` → confirm `PushChannel` record created
- [ ] **Flow step 3:** Create a Google Doc in Drive with "Transcript" in the title
- [ ] **Flow step 4:** Wait for Google Drive webhook to fire (may take 1–5 minutes)
  - Check Vercel function logs / terminal for `[webhook] Received Google Drive notification`
- [ ] **Flow step 5:** Confirm: dedup check passes (first event)
  - Check Redis Upstash dashboard for the dedup key
- [ ] **Flow step 6:** Confirm: job enqueued in QStash dashboard
- [ ] **Flow step 7:** Confirm: worker processes the job
  - Check: `JobHistory` record transitions from PROCESSING → COMPLETED
- [ ] **Flow step 8:** Confirm: `resultPayload` in `JobHistory` contains structured summary JSON
- [ ] **Flow step 9:** Navigate to dashboard → job history → confirm completed job appears

---

### 12.2 Security Tests

- [ ] **Test S1:** Send POST to `/api/webhooks/google-drive` with no `X-Goog-Channel-Token` header → expect `401`
- [ ] **Test S2:** Send POST with a valid channelId but wrong token → expect `401`
- [ ] **Test S3:** Encrypt an API key → store → decrypt → confirm identical to original (use `npx prisma studio` to inspect)
- [ ] **Test S4 (multi-tenant):** Sign in as User A → call `GET /api/user/config` → confirm only User A's data returned
- [ ] **Test S5 (multi-tenant):** With two accounts, call `GET /api/user/jobs` as User A → confirm no jobs from User B appear
- [ ] **Test S6:** Access `/api/user/config` without a session → confirm `401` response

---

### 12.3 Reliability Tests

- [ ] **Test R1:** Send same webhook twice within 5 seconds → confirm only one job enqueued (check QStash dashboard shows 1 message)
- [ ] **Test R2:** Modify worker to throw an error → confirm QStash retries the job (check QStash dashboard for retry attempts)
- [ ] **Test R3:** Make worker fail 3 times → confirm `FailedJob` record created in DB
- [ ] **Test R4:** Set `PushChannel.expiration` to 1 hour from now in DB → invoke cron endpoint manually → confirm channel renewed (old record deleted, new record created with future expiry)
- [ ] **Test R5:** Revoke Google OAuth token from Google account settings → trigger cron → confirm `ChannelRenewalError` written and alert shown on dashboard

---

### 12.4 Unit Test Coverage Checklist

- [ ] `src/tests/crypto/encryption.test.ts` — all encrypt/decrypt scenarios
- [ ] `src/tests/google/verify-webhook.test.ts` — all token verification scenarios
- [ ] `src/tests/redis/deduplication.test.ts` — first call, duplicate, different params
- [ ] `src/tests/destinations/router.test.ts` — all destination types
- [ ] `src/tests/destinations/slack-formatter.test.ts` — Block Kit format correctness
- [ ] `src/tests/ai/process-meeting.test.ts` — valid/invalid LLM responses
- [ ] `src/tests/webhooks/google-drive.test.ts` — all webhook pipeline branches
- [ ] Run full test suite: `npm run test:run` — confirm **zero failures**
- [ ] Commit: `git commit -m "test: add integration and unit test coverage for all phases"`

---

## Phase 13 — Deployment & Production Readiness

### 13.1 Vercel Configuration

- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Connect repository: `vercel link` (or connect via Vercel dashboard GitHub integration)
- [ ] Set all production environment variables in Vercel dashboard:
  - [ ] `DATABASE_URL` (production Neon/Vercel Postgres connection string)
  - [ ] `DIRECT_URL` (direct connection for migrations)
  - [ ] `NEXTAUTH_URL` (production domain: `https://your-project.vercel.app`)
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
  - [ ] `QSTASH_TOKEN`
  - [ ] `QSTASH_CURRENT_SIGNING_KEY`
  - [ ] `QSTASH_NEXT_SIGNING_KEY`
  - [ ] `OPENROUTER_API_KEY`
  - [ ] `ENCRYPTION_SECRET`
  - [ ] `WEBHOOK_BASE_URL` (production URL: `https://your-project.vercel.app`)
  - [ ] `CRON_SECRET`
- [ ] Add production OAuth redirect URI to Google Cloud Console:
  - `https://your-project.vercel.app/api/auth/callback/google`
- [ ] Run production database migration:
  ```bash
  npx prisma migrate deploy
  ```
  - Note: use `DIRECT_URL` for migrations (not pooled connection)
- [ ] Deploy to Vercel: `vercel --prod` or push to main branch
- [ ] Confirm: build succeeds in Vercel dashboard
- [ ] Confirm: cron job appears in Vercel dashboard under "Cron Jobs"

---

### 13.2 Production Smoke Test

- [ ] Navigate to production URL → confirm landing page loads
- [ ] Sign in with Google → confirm redirect to dashboard
- [ ] Click "Register Channel" → confirm `PushChannel` created in production DB
- [ ] Upload a Google Doc with "Transcript" in the name to Drive
- [ ] Wait 1–5 minutes → check Vercel function logs for webhook receipt
- [ ] Confirm: `JobHistory` record created and reaches COMPLETED status
- [ ] Confirm: cron job fires every 6 hours (check Vercel Cron Logs in dashboard)
- [ ] Check Upstash Redis dashboard: dedup keys visible
- [ ] Check Upstash QStash dashboard: messages processed, no failures

---

### 13.3 Monitoring & Observability Setup

- [ ] Confirm: Vercel function logs show structured JSON logs at each pipeline step
- [ ] Set up Upstash Redis alert: notify when approaching 8,000 commands/day (80% of 10k free tier)
- [ ] Set up Upstash QStash alert: notify when approaching 400 messages/day (80% of 500 free tier)
- [ ] Add a Vercel scheduled check: query `FailedJob` table count and log weekly
- [ ] Review `FailedJob` table after first week of operation
- [ ] Review `ChannelRenewalError` table — target: 0 entries

---

## Phase 14 — Documentation & Handoff

### 14.1 Developer README

- [ ] Update `README.md` with:
  - [ ] Project overview (1 paragraph)
  - [ ] Architecture diagram (ASCII or Mermaid):
    ```
    Google Drive → Webhook → Redis Dedup → QStash → Worker → OpenRouter → Destination
    ```
  - [ ] Prerequisites list (Node 20, ngrok, external account setup)
  - [ ] Local setup steps (clone → install → env vars → DB → ngrok → run)
  - [ ] How to run tests: `npm run test:run`
  - [ ] How to run Prisma Studio: `npx prisma studio`
  - [ ] Deployment instructions (Vercel + env vars)
  - [ ] How to add a new destination (Strategy Pattern guide)
  - [ ] How to add a new workflow (new webhook route → prompt template → same worker)

---

### 14.2 Operational Runbook

- [ ] Document: **Channel renewal failures**
  - Where to look: `ChannelRenewalError` table + Vercel Cron Logs
  - Common causes: OAuth token revoked by user, Google API quota exceeded
  - Fix: user reconnects Google account from dashboard

- [ ] Document: **Dead-letter queue — failed jobs**
  - Where to look: `FailedJob` table + QStash dashboard
  - How to replay: re-enqueue payload via `enqueueTranscriptJob()` from a script
  - Common causes: OpenRouter rate limit, Drive permission denied, malformed transcript

- [ ] Document: **User reports missing summaries — troubleshooting checklist**
  1. Check `PushChannel.expiration` — is channel expired?
  2. Check `ChannelRenewalError` — did renewal fail?
  3. Check `JobHistory` — was a job created at all?
  4. Check QStash dashboard — was the job enqueued but failed?
  5. Check `FailedJob` table — did it end up in dead-letter?
  6. Check `UserConfig.meetingSummariesEnabled` — is the feature toggled on?

- [ ] Document: **How to rotate `ENCRYPTION_SECRET`**
  1. Generate new secret: `openssl rand -hex 32`
  2. Write a migration script: decrypt all encrypted fields with old key, re-encrypt with new key
  3. Update env var in Vercel dashboard and redeploy
  4. Verify: spot-check a decrypted API key after rotation
  - ⚠️ Warning: changing the secret without re-encrypting all values will break decryption for existing keys

- [ ] Commit: `git commit -m "docs: add README setup guide and operational runbook"`

---

## Completion Checklist — Final Verification

Before declaring Phase 1 complete, confirm each of the following:

- [ ] All unit tests pass: `npm run test:run`
- [ ] Production build succeeds: `npm run build`
- [ ] Full E2E flow works on production (Google Meet → transcript → summary delivered)
- [ ] No plaintext API keys stored in database (verify via `npx prisma studio`)
- [ ] All webhook requests without valid tokens return 401
- [ ] Duplicate webhooks do not create duplicate jobs
- [ ] Channel renewal cron is running on schedule
- [ ] `ChannelRenewalError` table is empty
- [ ] `FailedJob` table is empty (or any entries are investigated)
- [ ] Dashboard shows job history for authenticated user
- [ ] Dashboard does NOT show data from other users
- [ ] README contains enough information for a new developer to set up locally without help

---

## Success Metrics Targets (from PRD Section 8)

| Metric | Target | How to Measure |
|---|---|---|
| Adoption | ≥ 50% of eng/product connects Google within 14 days | `SELECT COUNT(*) FROM "Account" WHERE provider = 'google'` |
| Execution Success | ≥ 99% delivery | `failed_jobs` count / `job_history` count |
| Channel Renewal | 0 missed transcripts | `channel_renewal_errors` WHERE acknowledged = false |
| Duplicate Rate | < 1% | Upstash Redis dedup hit rate in dashboard |
| User Satisfaction | ≥ 3 positive responses | Slack survey |

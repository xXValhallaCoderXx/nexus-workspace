# Nexus — Setup Tasks

Everything you need to configure before running the app locally or deploying.

---

## 1. PostgreSQL Database

- [ ] Provision a PostgreSQL instance (Neon, Supabase, Vercel Postgres, or Railway — all have free tiers)
- [ ] Copy the connection string and set `DATABASE_URL` in `.env.local`
- [ ] Run the initial migration:
  ```sh
  npx prisma migrate dev --name init
  ```
- [ ] Verify with `npx prisma studio`

---

## 2. Google Cloud Project

- [ ] Create a new project in [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Enable the **Google Drive API** (APIs & Services → Library)
- [ ] Configure the **OAuth consent screen**
  - App type: Internal (Google Workspace) or External (for testing)
  - Add scope: `https://www.googleapis.com/auth/drive.readonly`
- [ ] Create an **OAuth 2.0 Client ID** (type: Web Application)
  - Authorised redirect URI (local): `http://localhost:3000/api/auth/callback/google`
  - Authorised redirect URI (prod): `https://<your-domain>/api/auth/callback/google`
- [ ] Copy **Client ID** and **Client Secret** into `.env.local`:
  ```
  GOOGLE_CLIENT_ID=<your-client-id>
  GOOGLE_CLIENT_SECRET=<your-client-secret>
  ```

---

## 3. Upstash Redis

- [ ] Create a Redis database at [Upstash Console](https://console.upstash.com/) (free tier)
- [ ] Copy the REST URL and token into `.env.local`:
  ```
  UPSTASH_REDIS_REST_URL=<your-url>
  UPSTASH_REDIS_REST_TOKEN=<your-token>
  ```

---

## 4. Upstash QStash

- [ ] Enable QStash in [Upstash Console](https://console.upstash.com/qstash) (free tier)
- [ ] Copy the credentials into `.env.local`:
  ```
  QSTASH_TOKEN=<your-token>
  QSTASH_CURRENT_SIGNING_KEY=<your-current-key>
  QSTASH_NEXT_SIGNING_KEY=<your-next-key>
  ```

---

## 5. OpenRouter

- [ ] Create an account at [openrouter.ai](https://openrouter.ai/)
- [ ] Generate an API key
- [ ] Set it in `.env.local`:
  ```
  OPENROUTER_API_KEY=<your-key>
  ```
  > Users can also bring their own key via the dashboard — this is the fallback/default key.

---

## 6. Generate Secrets

Run these in your terminal and paste the output into `.env.local`:

```sh
# NextAuth session secret
openssl rand -base64 32
# → NEXTAUTH_SECRET=<output>

# AES-256 encryption key (64 hex chars)
openssl rand -hex 32
# → ENCRYPTION_SECRET=<output>

# Cron job auth secret
openssl rand -base64 32
# → CRON_SECRET=<output>
```

---

## 7. ngrok (Local Webhook Testing)

Google Drive push notifications need a publicly reachable URL to deliver webhooks.

- [ ] Sign up at [ngrok.com](https://ngrok.com/) (free tier)
- [ ] Install ngrok and authenticate:
  ```sh
  ngrok config add-authtoken <your-token>
  ```
- [ ] Start a tunnel when developing:
  ```sh
  ngrok http 3000
  ```
- [ ] Set the tunnel URL in `.env.local`:
  ```
  WEBHOOK_BASE_URL=https://<your-subdomain>.ngrok-free.app
  ```
  > Update this each time you restart ngrok (or use a reserved domain).

---

## 8. Final `.env.local` Checklist

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated>
GOOGLE_CLIENT_ID=<from step 2>
GOOGLE_CLIENT_SECRET=<from step 2>
UPSTASH_REDIS_REST_URL=<from step 3>
UPSTASH_REDIS_REST_TOKEN=<from step 3>
QSTASH_TOKEN=<from step 4>
QSTASH_CURRENT_SIGNING_KEY=<from step 4>
QSTASH_NEXT_SIGNING_KEY=<from step 4>
OPENROUTER_API_KEY=<from step 5>
ENCRYPTION_SECRET=<generated>
WEBHOOK_BASE_URL=<ngrok URL or production URL>
CRON_SECRET=<generated>
```

---

## 9. Verify Everything Works

```sh
npm run dev
```

1. Open `http://localhost:3000` — you should see the login page
2. Sign in with Google — should redirect to `/dashboard`
3. Check the database — `User`, `Account`, and `Session` records should exist
4. Click "Connect / Reconnect" on the dashboard to register a Drive push channel
5. Enable "Meeting Summaries" toggle
6. Upload a Google Doc with "Transcript" or "Meeting" in the name to your Drive
7. Check `/dashboard/history` for the processed job

---

## 10. Production Deployment (Vercel)

- [ ] Connect the GitHub repo to a [Vercel](https://vercel.com/) project
- [ ] Add all environment variables from step 8 in Vercel dashboard (Settings → Environment Variables)
  - Change `NEXTAUTH_URL` to your production domain
  - Change `WEBHOOK_BASE_URL` to your production domain
- [ ] Add the production callback URI to Google Cloud Console (step 2)
- [ ] Run migration against production DB:
  ```sh
  npx prisma migrate deploy
  ```
- [ ] Deploy and verify the cron job appears in Vercel dashboard (runs every 6 hours)

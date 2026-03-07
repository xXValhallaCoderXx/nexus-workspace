import { createHmac, randomBytes } from "crypto";

/**
 * Build an OAuth redirect URI for a given provider and callback path.
 *
 * Lookup order:
 *   1. {PROVIDER}_REDIRECT_BASE_URL  (per-provider, e.g. SLACK_REDIRECT_BASE_URL)
 *   2. NEXTAUTH_URL                  (default — localhost in dev, real domain in prod)
 *
 * This lets providers that require HTTPS (like Slack) use an ngrok tunnel
 * while everything else stays on localhost.
 */
export function buildOAuthRedirectUri(
  provider: string,
  path: string
): string {
  const base =
    process.env[`${provider}_REDIRECT_BASE_URL`] ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return `${base}${path}`;
}

/** The URL users normally access the app from (always NEXTAUTH_URL). */
export function getAppBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

// ── HMAC-signed state tokens ──────────────────────────────
// Replaces cookie-based CSRF for OAuth flows.
// Works across domains (ngrok ↔ localhost) since no cookies needed.

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be set");
  return secret;
}

/**
 * Create an HMAC-signed OAuth state token with the userId embedded.
 * Format:
 *   - legacy: nonce:timestamp:userId:signature
 *   - current: nonce:timestamp:userId:returnToBase64Url:signature
 * Valid for 10 minutes.
 */
export function createOAuthState(
  userId: string,
  options?: { returnTo?: string }
): string {
  const nonce = randomBytes(16).toString("hex");
  const ts = Date.now().toString();
  const returnTo = options?.returnTo
    ? Buffer.from(options.returnTo, "utf8").toString("base64url")
    : null;
  const payload = returnTo
    ? `${nonce}:${ts}:${userId}:${returnTo}`
    : `${nonce}:${ts}:${userId}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

/**
 * Verify an HMAC-signed OAuth state token.
 * Returns the embedded userId if valid, or null if tampered/expired.
 */
export function verifyOAuthState(
  state: string | null
): { userId: string; returnTo?: string } | null {
  if (!state) return null;

  const parts = state.split(":");
  if (parts.length !== 4 && parts.length !== 5) return null;

  const hasReturnTo = parts.length === 5;
  const [nonce, ts, userId, maybeReturnTo, maybeSig] = parts;
  const encodedReturnTo = hasReturnTo ? maybeReturnTo : undefined;
  const sig = hasReturnTo ? maybeSig : maybeReturnTo;
  const payload = hasReturnTo
    ? `${nonce}:${ts}:${userId}:${encodedReturnTo}`
    : `${nonce}:${ts}:${userId}`;
  const expected = createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  // Timing-safe comparison
  if (!sig) return null;
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  // Check token age (10 minutes max)
  const age = Date.now() - parseInt(ts, 10);
  if (age > 10 * 60 * 1000 || age < 0) return null;

  let returnTo: string | undefined;
  if (encodedReturnTo) {
    try {
      const decoded = Buffer.from(encodedReturnTo, "base64url").toString(
        "utf8"
      );
      if (decoded.startsWith("/")) {
        returnTo = decoded;
      }
    } catch {
      return null;
    }
  }

  return { userId, ...(returnTo ? { returnTo } : {}) };
}

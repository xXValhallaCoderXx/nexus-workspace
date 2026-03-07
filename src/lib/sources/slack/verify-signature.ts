import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_TIMESTAMP_DRIFT_SECONDS = 300; // 5 minutes

/**
 * Verify a Slack request signature using HMAC-SHA256.
 *
 * Slack signs every request with a shared secret. We recompute the signature
 * from the raw body and compare using a timing-safe comparison to prevent
 * replay attacks and forgery.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  request: Request,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "slack_signing_secret_missing",
      })
    );
    return false;
  }

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return false;
  }

  // Replay-attack protection: reject requests older than 5 minutes
  const requestAge = Math.abs(
    Math.floor(Date.now() / 1000) - Number(timestamp)
  );
  if (requestAge > MAX_TIMESTAMP_DRIFT_SECONDS) {
    return false;
  }

  const basestring = `v0:${timestamp}:${body}`;
  const computed = `v0=${createHmac("sha256", signingSecret).update(basestring).digest("hex")}`;

  // Both buffers must be the same length for timingSafeEqual
  const sigBuf = Buffer.from(signature, "utf-8");
  const computedBuf = Buffer.from(computed, "utf-8");

  if (sigBuf.length !== computedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, computedBuf);
}

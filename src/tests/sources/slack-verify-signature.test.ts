import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifySlackSignature } from "@/lib/sources/slack/verify-signature";

const SIGNING_SECRET = "test-signing-secret";
const BODY = '{"test":"payload"}';

function makeTimestamp(offsetSeconds = 0): string {
  return (Math.floor(Date.now() / 1000) + offsetSeconds).toString();
}

function computeSignature(secret: string, timestamp: string, body: string): string {
  const basestring = `v0:${timestamp}:${body}`;
  return `v0=${createHmac("sha256", secret).update(basestring).digest("hex")}`;
}

function makeRequest(headers: Record<string, string>): Request {
  return new Request("https://example.com", { method: "POST", headers });
}

describe("verifySlackSignature", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when SLACK_SIGNING_SECRET is not set", () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", "");
    const timestamp = makeTimestamp();
    const signature = computeSignature(SIGNING_SECRET, timestamp, BODY);
    const request = makeRequest({
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    });
    expect(verifySlackSignature(request, BODY)).toBe(false);
  });

  it("returns false when timestamp header is missing", () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", SIGNING_SECRET);
    const request = makeRequest({
      "x-slack-signature": "v0=abc123",
    });
    expect(verifySlackSignature(request, BODY)).toBe(false);
  });

  it("returns false when signature header is missing", () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", SIGNING_SECRET);
    const timestamp = makeTimestamp();
    const request = makeRequest({
      "x-slack-request-timestamp": timestamp,
    });
    expect(verifySlackSignature(request, BODY)).toBe(false);
  });

  it("returns false when request is older than 5 minutes (replay protection)", () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", SIGNING_SECRET);
    const staleTimestamp = makeTimestamp(-301);
    const signature = computeSignature(SIGNING_SECRET, staleTimestamp, BODY);
    const request = makeRequest({
      "x-slack-request-timestamp": staleTimestamp,
      "x-slack-signature": signature,
    });
    expect(verifySlackSignature(request, BODY)).toBe(false);
  });

  it("returns true for a valid signature", () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", SIGNING_SECRET);
    const timestamp = makeTimestamp();
    const signature = computeSignature(SIGNING_SECRET, timestamp, BODY);
    const request = makeRequest({
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    });
    expect(verifySlackSignature(request, BODY)).toBe(true);
  });

  it("returns false for a tampered signature", () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", SIGNING_SECRET);
    const timestamp = makeTimestamp();
    const signature = computeSignature(SIGNING_SECRET, timestamp, BODY);
    const tampered = signature.slice(0, -4) + "dead";
    const request = makeRequest({
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": tampered,
    });
    expect(verifySlackSignature(request, BODY)).toBe(false);
  });
});

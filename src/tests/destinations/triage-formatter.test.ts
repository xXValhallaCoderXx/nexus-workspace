import { describe, it, expect } from "vitest";
import {
  formatTriageDigestBlocks,
  formatTriageDigestMarkdown,
  type ClassifiedMessage,
} from "@/lib/destinations/triage-formatter";

const DIGEST_TIME = "2025-01-15 09:00 AM";

function makeMessage(
  overrides: Partial<ClassifiedMessage> & Pick<ClassifiedMessage, "id" | "category">
): ClassifiedMessage {
  return {
    author: "alice",
    content: "Test message",
    source: "slack",
    reason: "Test reason",
    ...overrides,
  };
}

const sampleMessages: ClassifiedMessage[] = [
  makeMessage({
    id: "1",
    author: "alice",
    content: "Can you approve this PR?",
    category: "ACTION_REQUIRED",
    channel: "engineering",
    permalink: "https://slack.com/msg/1",
  }),
  makeMessage({
    id: "2",
    author: "bob",
    content: "Deploy v2.1 is live",
    category: "READ_ONLY",
    channel: "deploys",
  }),
  makeMessage({
    id: "3",
    author: "ci-bot",
    content: "Build passed",
    category: "NOISE",
    source: "github",
  }),
];

describe("formatTriageDigestBlocks", () => {
  it("returns header block with digest time", () => {
    const blocks = formatTriageDigestBlocks(sampleMessages, DIGEST_TIME);
    const header = blocks[0] as Record<string, unknown>;
    expect(header.type).toBe("header");
    const text = header.text as Record<string, unknown>;
    expect(text.text).toContain(DIGEST_TIME);
  });

  it("groups messages by category with correct emoji labels", () => {
    const blocks = formatTriageDigestBlocks(sampleMessages, DIGEST_TIME);
    const texts = blocks
      .filter((b) => (b as Record<string, unknown>).type === "section")
      .map((b) => ((b as Record<string, unknown>).text as Record<string, unknown>).text as string);

    expect(texts.some((t) => t.includes("🔴") && t.includes("Action Required"))).toBe(true);
    expect(texts.some((t) => t.includes("📖") && t.includes("Read Only"))).toBe(true);
    expect(texts.some((t) => t.includes("🔇") && t.includes("Noise"))).toBe(true);
  });

  it("omits empty category sections", () => {
    const actionOnly = [sampleMessages[0]];
    const blocks = formatTriageDigestBlocks(actionOnly, DIGEST_TIME);
    const texts = blocks
      .filter((b) => (b as Record<string, unknown>).type === "section")
      .map((b) => ((b as Record<string, unknown>).text as Record<string, unknown>).text as string);

    expect(texts.some((t) => t.includes("Action Required"))).toBe(true);
    expect(texts.some((t) => t.includes("Read Only"))).toBe(false);
    expect(texts.some((t) => t.includes("Noise"))).toBe(false);
  });

  it("shows empty state message when no messages", () => {
    const blocks = formatTriageDigestBlocks([], DIGEST_TIME);
    const texts = blocks
      .filter((b) => (b as Record<string, unknown>).type === "section")
      .map((b) => ((b as Record<string, unknown>).text as Record<string, unknown>).text as string);

    expect(texts.some((t) => t.includes("No new mentions"))).toBe(true);
  });

  it("includes permalinks in message lines when available", () => {
    const blocks = formatTriageDigestBlocks(sampleMessages, DIGEST_TIME);
    const allText = JSON.stringify(blocks);
    expect(allText).toContain("https://slack.com/msg/1");
    expect(allText).toContain("View");
  });
});

describe("formatTriageDigestMarkdown", () => {
  it("returns markdown with header", () => {
    const md = formatTriageDigestMarkdown(sampleMessages, DIGEST_TIME);
    expect(md).toContain(`# 📬 Triage Digest — ${DIGEST_TIME}`);
    expect(md).toContain("3 messages triaged");
  });

  it("groups messages by category", () => {
    const md = formatTriageDigestMarkdown(sampleMessages, DIGEST_TIME);
    expect(md).toContain("## 🔴 Action Required (1)");
    expect(md).toContain("## 📖 Read Only (1)");
    expect(md).toContain("## 🔇 Noise (1)");
    expect(md).toContain("**alice**");
    expect(md).toContain("**bob**");
    expect(md).toContain("**ci-bot**");
  });

  it("shows empty state when no messages", () => {
    const md = formatTriageDigestMarkdown([], DIGEST_TIME);
    expect(md).toContain("No new mentions");
  });
});

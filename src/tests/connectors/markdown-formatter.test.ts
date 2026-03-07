import { describe, it, expect } from "vitest";
import { formatSummaryAsMarkdown } from "@/lib/connectors/markdown-formatter";
import type { MeetingSummaryPayload } from "@/lib/connectors/payload";

function makePayload(overrides: Partial<MeetingSummaryPayload> = {}): MeetingSummaryPayload {
  return {
    summaryId: "test-123",
    meetingTitle: "Sprint Planning",
    meetingDate: "2025-03-05",
    sourceType: "google_meet",
    sourceFileId: "file-abc",
    attendees: [{ name: "Alice" }, { name: "Bob" }],
    summary: "We discussed the upcoming sprint.",
    topics: ["Sprint goals", "Capacity"],
    decisions: ["Ship feature X by Friday"],
    actionItems: [{ owner: "Alice", task: "Write tests", deadline: "March 7" }],
    followUps: ["Review PR on Monday"],
    processedAt: "2025-03-05T10:00:00Z",
    modelUsed: "gpt-4o",
    nexusUrl: "https://app.nexus.com/summary/test-123",
    ...overrides,
  };
}

describe("formatSummaryAsMarkdown", () => {
  it("includes meeting title as H1", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("# Sprint Planning");
  });

  it("includes date and attendees", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("**Date:** 2025-03-05");
    expect(md).toContain("**Attendees:** Alice, Bob");
  });

  it("includes summary section", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("## Summary");
    expect(md).toContain("We discussed the upcoming sprint.");
  });

  it("includes topics", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("## Key Topics");
    expect(md).toContain("- Sprint goals");
    expect(md).toContain("- Capacity");
  });

  it("includes decisions", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("## Decisions");
    expect(md).toContain("- Ship feature X by Friday");
  });

  it("includes action items with owner and deadline", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("## Action Items");
    expect(md).toContain("- **Alice:** Write tests (by March 7)");
  });

  it("includes follow-ups", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("## Follow-Ups");
    expect(md).toContain("- Review PR on Monday");
  });

  it("includes Nexus URL", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).toContain("[View in Nexus](https://app.nexus.com/summary/test-123)");
  });

  it("omits empty sections", () => {
    const md = formatSummaryAsMarkdown(
      makePayload({ topics: [], decisions: [], actionItems: [], followUps: [] })
    );
    expect(md).not.toContain("## Key Topics");
    expect(md).not.toContain("## Decisions");
    expect(md).not.toContain("## Action Items");
    expect(md).not.toContain("## Follow-Ups");
  });

  it("omits duration when not provided", () => {
    const md = formatSummaryAsMarkdown(makePayload());
    expect(md).not.toContain("**Duration:**");
  });

  it("includes duration when provided", () => {
    const md = formatSummaryAsMarkdown(makePayload({ meetingDuration: 45 }));
    expect(md).toContain("**Duration:** 45 minutes");
  });

  it("handles action items without deadline", () => {
    const md = formatSummaryAsMarkdown(
      makePayload({
        actionItems: [{ owner: "Bob", task: "Deploy", deadline: undefined }],
      })
    );
    expect(md).toContain("- **Bob:** Deploy");
    expect(md).not.toContain("(by ");
  });

  it("handles empty attendees list", () => {
    const md = formatSummaryAsMarkdown(makePayload({ attendees: [] }));
    expect(md).not.toContain("**Attendees:**");
  });
});

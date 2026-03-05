import { describe, it, expect } from "vitest";
import { buildPayloadFromLegacy, meetingSummaryPayloadSchema } from "@/lib/connectors/payload";

describe("buildPayloadFromLegacy", () => {
  const legacyOutput = {
    title: "Team Standup",
    date: "2025-03-05",
    attendees: ["Alice", "Bob"],
    summary: "Quick standup covering blockers.",
    actionItems: [
      { owner: "Alice", task: "Fix CI pipeline", deadline: "March 6" },
    ],
    decisions: ["Move to biweekly sprints"],
    followUps: ["Check deployment status"],
  };

  const meta = {
    summaryId: "sum-001",
    sourceFileId: "file-abc",
    modelUsed: "gpt-4o",
    nexusBaseUrl: "https://app.nexus.com",
  };

  it("produces a valid MeetingSummaryPayload", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    const result = meetingSummaryPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("maps fields correctly", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    expect(payload.summaryId).toBe("sum-001");
    expect(payload.meetingTitle).toBe("Team Standup");
    expect(payload.meetingDate).toBe("2025-03-05");
    expect(payload.sourceFileId).toBe("file-abc");
    expect(payload.modelUsed).toBe("gpt-4o");
    expect(payload.sourceType).toBe("google_meet");
  });

  it("maps attendees from strings to objects", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    expect(payload.attendees).toEqual([{ name: "Alice" }, { name: "Bob" }]);
  });

  it("maps action items preserving deadlines", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    expect(payload.actionItems).toHaveLength(1);
    expect(payload.actionItems[0]).toEqual({
      owner: "Alice",
      task: "Fix CI pipeline",
      deadline: "March 6",
    });
  });

  it("builds nexusUrl from base + summaryId", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    expect(payload.nexusUrl).toBe(
      "https://app.nexus.com/dashboard?note=sum-001"
    );
  });

  it("defaults date to current ISO string when null", () => {
    const payload = buildPayloadFromLegacy(
      { ...legacyOutput, date: null },
      meta
    );
    // Should be a valid ISO date string
    expect(() => new Date(payload.meetingDate)).not.toThrow();
    expect(new Date(payload.meetingDate).getFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it("sets topics to empty array (not in legacy format)", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    expect(payload.topics).toEqual([]);
  });

  it("includes processedAt as ISO string", () => {
    const payload = buildPayloadFromLegacy(legacyOutput, meta);
    expect(payload.processedAt).toBeDefined();
    expect(() => new Date(payload.processedAt)).not.toThrow();
  });
});

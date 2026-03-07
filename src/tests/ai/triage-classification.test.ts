import { describe, it, expect } from "vitest";
import {
  triageClassificationOutput,
  buildTriageUserContent,
  TRIAGE_CLASSIFICATION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/triage-classification";

describe("triageClassificationOutput", () => {
  it("parses valid output correctly", () => {
    const valid = {
      classifications: [
        { id: "1", category: "ACTION_REQUIRED", reason: "Needs reply" },
        { id: "2", category: "READ_ONLY", reason: "FYI update" },
        { id: "3", category: "NOISE", reason: "Bot spam" },
      ],
    };
    const result = triageClassificationOutput.parse(valid);
    expect(result.classifications).toHaveLength(3);
    expect(result.classifications[0].category).toBe("ACTION_REQUIRED");
    expect(result.classifications[1].category).toBe("READ_ONLY");
    expect(result.classifications[2].category).toBe("NOISE");
  });

  it("rejects invalid category values", () => {
    const invalid = {
      classifications: [
        { id: "1", category: "UNKNOWN", reason: "Bad category" },
      ],
    };
    expect(() => triageClassificationOutput.parse(invalid)).toThrow();
  });

  it("rejects missing required fields", () => {
    const missingReason = {
      classifications: [{ id: "1", category: "NOISE" }],
    };
    expect(() => triageClassificationOutput.parse(missingReason)).toThrow();

    const missingId = {
      classifications: [{ category: "NOISE", reason: "test" }],
    };
    expect(() => triageClassificationOutput.parse(missingId)).toThrow();

    const missingClassifications = {};
    expect(() =>
      triageClassificationOutput.parse(missingClassifications)
    ).toThrow();
  });
});

describe("buildTriageUserContent", () => {
  it("returns a JSON string of messages", () => {
    const messages = [
      {
        id: "m1",
        author: "alice",
        content: "Can you review this PR?",
        source: "slack",
        channel: "engineering",
      },
      {
        id: "m2",
        author: "bob",
        content: "Deploy complete",
        source: "slack",
      },
    ];
    const result = buildTriageUserContent(messages);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      id: "m1",
      author: "alice",
      content: "Can you review this PR?",
    });
    expect(parsed[1].channel).toBeUndefined();
  });
});

describe("TRIAGE_CLASSIFICATION_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof TRIAGE_CLASSIFICATION_SYSTEM_PROMPT).toBe("string");
    expect(TRIAGE_CLASSIFICATION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});

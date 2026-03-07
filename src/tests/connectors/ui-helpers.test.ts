import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Inline test for DestinationPills rendering logic (unit test without full component)
describe("Destination label mapping", () => {
  const destinationLabels: Record<string, string> = {
    DATABASE: "Nexus",
    SLACK: "Slack",
    CLICKUP: "ClickUp",
    nexus_history: "Nexus",
    slack: "Slack",
    clickup: "ClickUp",
  };

  it("maps DATABASE to Nexus", () => {
    expect(destinationLabels["DATABASE"]).toBe("Nexus");
  });

  it("maps SLACK to Slack", () => {
    expect(destinationLabels["SLACK"]).toBe("Slack");
  });

  it("maps connector IDs to display names", () => {
    expect(destinationLabels["clickup"]).toBe("ClickUp");
  });

  it("handles unknown destinations by falling through", () => {
    const dest = "unknown_service";
    expect(destinationLabels[dest] ?? dest).toBe("unknown_service");
  });
});

describe("Destination string parsing", () => {
  function parseDestinations(str: string | null): string[] {
    if (!str) return [];
    return str.split(",").map((d) => d.trim()).filter(Boolean);
  }

  it("parses comma-separated destinations", () => {
    expect(parseDestinations("DATABASE,SLACK")).toEqual(["DATABASE", "SLACK"]);
  });

  it("handles whitespace", () => {
    expect(parseDestinations("DATABASE, SLACK, clickup")).toEqual([
      "DATABASE",
      "SLACK",
      "clickup",
    ]);
  });

  it("returns empty for null", () => {
    expect(parseDestinations(null)).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseDestinations("")).toEqual([]);
  });

  it("handles single destination", () => {
    expect(parseDestinations("DATABASE")).toEqual(["DATABASE"]);
  });
});

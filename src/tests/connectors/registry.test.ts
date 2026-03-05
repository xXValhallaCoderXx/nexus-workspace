import { describe, it, expect } from "vitest";
import {
  registerConnector,
  getConnectorProvider,
  getAllConnectors,
  getConnectorIds,
} from "@/lib/connectors/registry";
import type { Connector, AuthResult, DeliveryResult } from "@/lib/connectors/types";

function makeMockConnector(id: string): Connector {
  return {
    id,
    displayName: `Mock ${id}`,
    authenticate: async () => ({ success: true, connectorId: id } as AuthResult),
    disconnect: async () => {},
    healthCheck: async () => "connected" as const,
    getConfigSchema: () => ({ fields: [] }),
    validateConfig: async () => true,
    deliver: async () => ({ success: true, connectorId: id } as DeliveryResult),
  };
}

describe("Connector Registry", () => {
  // Note: registry is a shared module singleton; tests may see connectors from setup.ts
  // if that file has been imported. These tests focus on the registration behavior.

  it("registers and retrieves a connector", () => {
    const connector = makeMockConnector("test-connector-1");
    registerConnector(connector);
    expect(getConnectorProvider("test-connector-1")).toBe(connector);
  });

  it("returns undefined for unknown connector", () => {
    expect(getConnectorProvider("nonexistent-xyz")).toBeUndefined();
  });

  it("lists all registered connectors", () => {
    const connector = makeMockConnector("test-connector-2");
    registerConnector(connector);
    const all = getAllConnectors();
    expect(all.some((c) => c.id === "test-connector-2")).toBe(true);
  });

  it("lists all registered connector IDs", () => {
    const connector = makeMockConnector("test-connector-3");
    registerConnector(connector);
    const ids = getConnectorIds();
    expect(ids).toContain("test-connector-3");
  });

  it("overwrites connector with same ID on re-register", () => {
    const v1 = makeMockConnector("dup-connector");
    const v2 = { ...makeMockConnector("dup-connector"), displayName: "Updated" };
    registerConnector(v1);
    registerConnector(v2);
    expect(getConnectorProvider("dup-connector")?.displayName).toBe("Updated");
  });
});

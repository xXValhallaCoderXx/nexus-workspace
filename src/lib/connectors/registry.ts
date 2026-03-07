// ──────────────────────────────────────────────
// Connector Registry
// ──────────────────────────────────────────────
// Central registry of all available connectors.
// New connectors are registered here — no changes
// needed to the processing pipeline or queue.

import type { Connector } from "./types";

const connectors = new Map<string, Connector>();

export function registerConnector(connector: Connector): void {
  connectors.set(connector.id, connector);
}

export function getConnectorProvider(connectorId: string): Connector | undefined {
  return connectors.get(connectorId);
}

export function getAllConnectors(): Connector[] {
  return Array.from(connectors.values());
}

export function getConnectorIds(): string[] {
  return Array.from(connectors.keys());
}

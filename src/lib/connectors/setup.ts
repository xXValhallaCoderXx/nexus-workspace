// Registers all available connectors.
// Import this module early in the app lifecycle (e.g., in layout or middleware).

import { registerConnector } from "./registry";
import { ClickUpConnector } from "./clickup-connector";

let registered = false;

export function ensureConnectorsRegistered(): void {
  if (registered) return;
  registerConnector(new ClickUpConnector());
  registered = true;
}

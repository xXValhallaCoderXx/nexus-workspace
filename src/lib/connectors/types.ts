// ──────────────────────────────────────────────
// Connector Interface Contract (spec §1.1)
// ──────────────────────────────────────────────
// Every output destination implements this interface.
// This is the single integration point between the
// summarisation pipeline and any delivery target.

import type { MeetingSummaryPayload } from "./payload";

// ── Auth ────────────────────────────────────

export interface AuthResult {
  success: boolean;
  connectorId: string;
  /** Display label for the connected account (e.g. workspace name) */
  accountLabel?: string;
  error?: string;
}

export type ConnectionStatus = "connected" | "disconnected" | "expired";

// ── Config ──────────────────────────────────

export interface ConnectorConfigField {
  key: string;
  label: string;
  type: "select" | "search" | "text";
  required: boolean;
  /** For select/search: async data source endpoint */
  dataSource?: string;
  dependsOn?: string;
}

export interface ConnectorConfigSchema {
  fields: ConnectorConfigField[];
}

export interface UserConnectorConfig {
  connectorId: string;
  enabled: boolean;
  configJson: Record<string, unknown> | null;
  oauthTokens: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  } | null;
}

// ── Delivery ────────────────────────────────

export interface DeliveryResult {
  success: boolean;
  connectorId: string;
  /** External resource ID (e.g. ClickUp doc ID) */
  externalId?: string;
  error?: string;
}

// ── Connector Interface ─────────────────────

export interface Connector {
  /** Unique identifier: 'clickup', 'slack', etc. */
  readonly id: string;

  /** Human-readable name for the Settings UI */
  readonly displayName: string;

  /** Initiate OAuth / auth setup */
  authenticate(userId: string): Promise<AuthResult>;

  /** Remove connection and revoke tokens */
  disconnect(userId: string): Promise<void>;

  /** Check if the connection is still valid */
  healthCheck(userId: string): Promise<ConnectionStatus>;

  /** Return the config schema for the Settings UI */
  getConfigSchema(): ConnectorConfigSchema;

  /** Validate a user's config before enabling delivery */
  validateConfig(config: Record<string, unknown>): Promise<boolean>;

  /** Transform payload and deliver to destination */
  deliver(
    payload: MeetingSummaryPayload,
    config: UserConnectorConfig
  ): Promise<DeliveryResult>;
}

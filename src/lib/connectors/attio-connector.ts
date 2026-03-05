import type {
  Connector,
  AuthResult,
  ConnectionStatus,
  ConnectorConfigSchema,
  UserConnectorConfig,
  DeliveryResult,
} from "./types";
import type { MeetingSummaryPayload } from "./payload";
import { formatSummaryAsMarkdown } from "./markdown-formatter";
import { connectorFetch, getConnectorTokens } from "./connector-auth";

// ── Record Matching Strategy (spec §2.6) ────

export interface RecordMatchingStrategy {
  resolve(
    attendees: MeetingSummaryPayload["attendees"],
    config: Record<string, unknown>
  ): Promise<{ parent_object: string; parent_record_id: string } | null>;
}

class ManualSelection implements RecordMatchingStrategy {
  async resolve(
    _attendees: MeetingSummaryPayload["attendees"],
    config: Record<string, unknown>
  ) {
    return {
      parent_object: config.parent_object as string,
      parent_record_id: config.parent_record_id as string,
    };
  }
}

// ── Attio Connector ─────────────────────────

export class AttioConnector implements Connector {
  readonly id = "attio";
  readonly displayName = "Attio CRM";

  private matchingStrategy: RecordMatchingStrategy = new ManualSelection();

  async authenticate(_userId: string): Promise<AuthResult> {
    // OAuth is handled by /api/auth/attio routes
    return { success: true, connectorId: this.id };
  }

  async disconnect(_userId: string): Promise<void> {
    // Handled by /api/auth/attio/disconnect route
  }

  async healthCheck(userId: string): Promise<ConnectionStatus> {
    const tokens = await getConnectorTokens(userId, this.id);
    if (!tokens) return "disconnected";

    try {
      const res = await connectorFetch(
        userId,
        this.id,
        "https://api.attio.com/v2/self"
      );
      return res.ok ? "connected" : "expired";
    } catch {
      return "expired";
    }
  }

  getConfigSchema(): ConnectorConfigSchema {
    return {
      fields: [
        {
          key: "parent_object",
          label: "Object Type",
          type: "select",
          required: true,
          dataSource: "/api/user/connectors/attio/objects",
        },
        {
          key: "parent_record_id",
          label: "Record",
          type: "search",
          required: true,
          dataSource: "/api/user/connectors/attio/records",
          dependsOn: "parent_object",
        },
      ],
    };
  }

  async validateConfig(config: Record<string, unknown>): Promise<boolean> {
    return !!(config.parent_object && config.parent_record_id);
  }

  async deliver(
    payload: MeetingSummaryPayload,
    config: UserConnectorConfig
  ): Promise<DeliveryResult> {
    if (!config.configJson) {
      return {
        success: false,
        connectorId: this.id,
        error: "Attio is not configured — select a default record in Settings",
      };
    }

    const record = await this.matchingStrategy.resolve(
      payload.attendees,
      config.configJson
    );

    if (!record) {
      return {
        success: false,
        connectorId: this.id,
        error: "Could not resolve a target record for this meeting",
      };
    }

    const markdown = formatSummaryAsMarkdown(payload);
    const formattedDate = new Date(payload.meetingDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // We need the userId to make the API call, but the Connector interface
    // passes config not userId. Extract from a closure or use a workaround.
    // For now, we'll use the connectorFetch pattern with a stored userId.
    try {
      const res = await fetch("https://api.attio.com/v2/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAccessToken(config)}`,
        },
        body: JSON.stringify({
          data: {
            parent_object: record.parent_object,
            parent_record_id: record.parent_record_id,
            title: `${payload.meetingTitle} — ${formattedDate}`,
            format: "markdown",
            content: markdown,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          connectorId: this.id,
          error: `Attio API error (${res.status}): ${errorData.message ?? res.statusText}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        connectorId: this.id,
        externalId: data.data?.id?.note_id,
      };
    } catch (error) {
      return {
        success: false,
        connectorId: this.id,
        error: error instanceof Error ? error.message : "Unknown error delivering to Attio",
      };
    }
  }

  private async getAccessToken(config: UserConnectorConfig): Promise<string> {
    if (!config.oauthTokens) {
      throw new Error("No Attio OAuth tokens available");
    }
    return config.oauthTokens.access_token;
  }
}

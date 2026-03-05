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
import { getConnectorTokens } from "./connector-auth";

export class ClickUpConnector implements Connector {
  readonly id = "clickup";
  readonly displayName = "ClickUp";

  async authenticate(_userId: string): Promise<AuthResult> {
    return { success: true, connectorId: this.id };
  }

  async disconnect(_userId: string): Promise<void> {
    // Handled by /api/auth/clickup/disconnect route
  }

  async healthCheck(userId: string): Promise<ConnectionStatus> {
    const tokens = await getConnectorTokens(userId, this.id);
    if (!tokens) return "disconnected";

    try {
      const res = await fetch("https://api.clickup.com/api/v2/user", {
        headers: { Authorization: tokens.access_token },
      });
      return res.ok ? "connected" : "disconnected";
    } catch {
      return "disconnected";
    }
  }

  getConfigSchema(): ConnectorConfigSchema {
    return {
      fields: [
        {
          key: "workspace_id",
          label: "Workspace",
          type: "select",
          required: true,
          dataSource: "/api/user/connectors/clickup/workspaces",
        },
        {
          key: "space_id",
          label: "Space",
          type: "select",
          required: true,
          dataSource: "/api/user/connectors/clickup/spaces",
          dependsOn: "workspace_id",
        },
        {
          key: "folder_id",
          label: "Folder (optional)",
          type: "select",
          required: false,
          dataSource: "/api/user/connectors/clickup/folders",
          dependsOn: "space_id",
        },
      ],
    };
  }

  async validateConfig(config: Record<string, unknown>): Promise<boolean> {
    return !!(config.workspace_id && config.space_id);
  }

  async deliver(
    payload: MeetingSummaryPayload,
    config: UserConnectorConfig
  ): Promise<DeliveryResult> {
    if (!config.configJson) {
      return {
        success: false,
        connectorId: this.id,
        error: "ClickUp is not configured — select a workspace and space in Settings",
      };
    }

    if (!config.oauthTokens) {
      return {
        success: false,
        connectorId: this.id,
        error: "ClickUp is not connected — reconnect in Settings",
      };
    }

    const { workspace_id, space_id, folder_id } = config.configJson as {
      workspace_id: string;
      space_id: string;
      folder_id?: string | null;
    };

    const accessToken = config.oauthTokens.access_token;
    const markdown = formatSummaryAsMarkdown(payload);
    const formattedDate = new Date(payload.meetingDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    try {
      // Step 1: Create Doc
      const docRes = await fetch(
        `https://api.clickup.com/api/v3/workspaces/${workspace_id}/docs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken,
          },
          body: JSON.stringify({
            name: `${payload.meetingTitle} — ${formattedDate}`,
            parent: {
              id: folder_id || space_id,
              type: folder_id ? "folder" : "space",
            },
            visibility: "private",
          }),
        }
      );

      if (!docRes.ok) {
        const errorData = await docRes.json().catch(() => ({}));
        return {
          success: false,
          connectorId: this.id,
          error: `ClickUp Doc creation failed (${docRes.status}): ${errorData.err ?? docRes.statusText}`,
        };
      }

      const docData = await docRes.json();
      const docId = docData.id;

      // Step 2: Create Page with content
      const pageRes = await fetch(
        `https://api.clickup.com/api/v3/workspaces/${workspace_id}/docs/${docId}/pages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken,
          },
          body: JSON.stringify({
            name: "Meeting Summary",
            content: markdown,
            content_format: "markdown",
          }),
        }
      );

      if (!pageRes.ok) {
        // Doc was created but page failed — still return the doc ID
        const errorData = await pageRes.json().catch(() => ({}));
        return {
          success: false,
          connectorId: this.id,
          externalId: docId,
          error: `ClickUp page creation failed (${pageRes.status}): ${errorData.err ?? pageRes.statusText}`,
        };
      }

      return {
        success: true,
        connectorId: this.id,
        externalId: docId,
      };
    } catch (error) {
      return {
        success: false,
        connectorId: this.id,
        error: error instanceof Error ? error.message : "Unknown error delivering to ClickUp",
      };
    }
  }
}

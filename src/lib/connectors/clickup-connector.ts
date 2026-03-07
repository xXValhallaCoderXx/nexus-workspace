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

  private static readonly NEXUS_DOC_NAME = "Meeting Summaries";

  /**
   * Find the shared "Meeting Summaries" doc, or create it if it doesn't exist.
   */
  private async findOrCreateDoc(
    workspaceId: string,
    parentId: string,
    parentType: number,
    accessToken: string
  ): Promise<{ id: string } | { error: string }> {
    // Search existing docs for our shared doc
    const listRes = await fetch(
      `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`,
      { headers: { Authorization: accessToken } }
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = listData.docs?.find(
        (d: { name: string; parent?: { id: string }; deleted: boolean }) =>
          d.name === ClickUpConnector.NEXUS_DOC_NAME &&
          d.parent?.id === parentId &&
          !d.deleted
      );
      if (existing) return { id: existing.id };
    }

    // Create the shared doc
    const createRes = await fetch(
      `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
        },
        body: JSON.stringify({
          name: ClickUpConnector.NEXUS_DOC_NAME,
          parent: { id: parentId, type: parentType },
          visibility: "PRIVATE",
          create_page: false,
        }),
      }
    );

    if (!createRes.ok) {
      const errorBody = await createRes.text().catch(() => "");
      console.error(JSON.stringify({ event: "clickup_doc_create_error", status: createRes.status, body: errorBody }));
      const errorData = errorBody ? (() => { try { return JSON.parse(errorBody); } catch { return {}; } })() : {};
      return { error: `ClickUp Doc creation failed (${createRes.status}): ${errorData.err ?? createRes.statusText}` };
    }

    const docData = await createRes.json();
    return { id: docData.id };
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
      // ClickUp v3 parent types: 4=space, 5=folder
      const parentId = folder_id || space_id;
      const parentType = folder_id ? 5 : 4;

      // Step 1: Find or create the shared "Meeting Summaries" doc
      const docResult = await this.findOrCreateDoc(workspace_id, parentId, parentType, accessToken);
      if ("error" in docResult) {
        return { success: false, connectorId: this.id, error: docResult.error };
      }

      // Step 2: Add this meeting as a page
      const pageRes = await fetch(
        `https://api.clickup.com/api/v3/workspaces/${workspace_id}/docs/${docResult.id}/pages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken,
          },
          body: JSON.stringify({
            name: `${payload.meetingTitle} — ${formattedDate}`,
            content: markdown,
            content_format: "text/md",
          }),
        }
      );

      if (!pageRes.ok) {
        const errorData = await pageRes.json().catch(() => ({}));
        return {
          success: false,
          connectorId: this.id,
          externalId: docResult.id,
          error: `ClickUp page creation failed (${pageRes.status}): ${errorData.err ?? pageRes.statusText}`,
        };
      }

      return {
        success: true,
        connectorId: this.id,
        externalId: docResult.id,
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

import type {
  DestinationProviderContract,
  ArtifactForDelivery,
  DestinationConfig,
  DeliveryResult,
} from "./types";
import { formatSummaryAsMarkdown } from "./markdown-formatter";

export class ClickUpDestinationProvider implements DestinationProviderContract {
  readonly provider = "CLICKUP" as const;

  validateConfig(config: DestinationConfig): boolean {
    const cfg = config.configJson;
    return !!(cfg?.workspace_id && cfg?.space_id && config.oauthTokens);
  }

  private static readonly NEXUS_DOC_NAME = "Meeting Summaries";

  private async findOrCreateDoc(
    workspaceId: string,
    parentId: string,
    parentType: number,
    accessToken: string
  ): Promise<{ id: string } | { error: string }> {
    const listRes = await fetch(
      `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`,
      { headers: { Authorization: accessToken } }
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = listData.docs?.find(
        (d: { name: string; parent?: { id: string }; deleted: boolean }) =>
          d.name === ClickUpDestinationProvider.NEXUS_DOC_NAME &&
          d.parent?.id === parentId &&
          !d.deleted
      );
      if (existing) return { id: existing.id };
    }

    const createRes = await fetch(
      `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
        },
        body: JSON.stringify({
          name: ClickUpDestinationProvider.NEXUS_DOC_NAME,
          parent: { id: parentId, type: parentType },
          visibility: "PRIVATE",
          create_page: false,
        }),
      }
    );

    if (!createRes.ok) {
      const errorBody = await createRes.text().catch(() => "");
      const errorData = errorBody
        ? (() => {
            try {
              return JSON.parse(errorBody);
            } catch {
              return {};
            }
          })()
        : {};
      return {
        error: `ClickUp Doc creation failed (${createRes.status}): ${errorData.err ?? createRes.statusText}`,
      };
    }

    const docData = await createRes.json();
    return { id: docData.id };
  }

  async deliver(
    artifact: ArtifactForDelivery,
    config: DestinationConfig,
    _userId: string
  ): Promise<DeliveryResult> {
    if (!config.configJson) {
      return {
        success: false,
        provider: this.provider,
        error: "ClickUp is not configured — select a workspace and space in Settings",
      };
    }

    if (!config.oauthTokens) {
      return {
        success: false,
        provider: this.provider,
        error: "ClickUp is not connected — reconnect in Settings",
      };
    }

    const { workspace_id, space_id, folder_id } = config.configJson as {
      workspace_id: string;
      space_id: string;
      folder_id?: string | null;
    };

    const accessToken = config.oauthTokens.access_token;
    const payload = artifact.payloadJson as Record<string, unknown> | null;

    const meetingTitle = (payload?.title as string) ?? artifact.title ?? "Meeting Summary";
    const meetingDate = (payload?.date as string) ?? new Date().toISOString();
    const attendees = (payload?.attendees as string[]) ?? [];
    const summary = (payload?.summary as string) ?? artifact.summaryText ?? "";
    const decisions = (payload?.decisions as string[]) ?? [];
    const actionItems =
      (payload?.actionItems as Array<{
        owner: string;
        task: string;
        deadline?: string | null;
      }>) ?? [];
    const followUps = (payload?.followUps as string[]) ?? [];

    const sourceRefs = artifact.sourceRefsJson as Record<string, unknown> | null;
    const sourceFileId = sourceRefs?.fileId as string | undefined;
    const nexusBaseUrl = process.env.NEXTAUTH_URL ?? "https://nexus.app";

    const markdown = formatSummaryAsMarkdown({
      meetingTitle,
      meetingDate,
      attendees: attendees.map((a) =>
        typeof a === "string" ? { name: a } : a
      ),
      summary,
      topics: [],
      decisions,
      actionItems: actionItems.map((ai) => ({
        owner: ai.owner,
        task: ai.task,
        deadline: ai.deadline,
      })),
      followUps,
      sourceFileId: sourceFileId ?? "",
      nexusUrl: `${nexusBaseUrl}/dashboard?note=${artifact.id}`,
    });

    const formattedDate = new Date(meetingDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    try {
      const parentId = folder_id || space_id;
      const parentType = folder_id ? 5 : 4;

      const docResult = await this.findOrCreateDoc(
        workspace_id,
        parentId,
        parentType,
        accessToken
      );
      if ("error" in docResult) {
        return { success: false, provider: this.provider, error: docResult.error };
      }

      const pageRes = await fetch(
        `https://api.clickup.com/api/v3/workspaces/${workspace_id}/docs/${docResult.id}/pages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken,
          },
          body: JSON.stringify({
            name: `${meetingTitle} — ${formattedDate}`,
            content: markdown,
            content_format: "text/md",
          }),
        }
      );

      if (!pageRes.ok) {
        const errorData = await pageRes.json().catch(() => ({}));
        return {
          success: false,
          provider: this.provider,
          externalId: docResult.id,
          error: `ClickUp page creation failed (${pageRes.status}): ${errorData.err ?? pageRes.statusText}`,
        };
      }

      const externalUrl = `https://app.clickup.com/${workspace_id}/docs/${docResult.id}`;

      return {
        success: true,
        provider: this.provider,
        externalId: docResult.id,
        externalUrl,
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        error: error instanceof Error ? error.message : "Unknown error delivering to ClickUp",
      };
    }
  }
}

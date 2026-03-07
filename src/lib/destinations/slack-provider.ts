import type {
  DestinationProviderContract,
  ArtifactForDelivery,
  DestinationConfig,
  DeliveryResult,
} from "./types";
import { formatSlackBlocks } from "./slack-formatter";

export class SlackDestinationProvider implements DestinationProviderContract {
  readonly provider = "SLACK" as const;

  validateConfig(config: DestinationConfig): boolean {
    return !!config.externalAccountId;
  }

  async deliver(
    artifact: ArtifactForDelivery,
    config: DestinationConfig,
    _userId: string
  ): Promise<DeliveryResult> {
    const slackUserId = config.externalAccountId;
    if (!slackUserId) {
      return {
        success: false,
        provider: this.provider,
        error: "Slack not connected — visit Settings to connect your account",
      };
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return {
        success: false,
        provider: this.provider,
        error: "SLACK_BOT_TOKEN environment variable is not configured",
      };
    }

    const payload = artifact.payloadJson as {
      title?: string;
      date?: string | null;
      attendees?: string[];
      summary?: string;
      actionItems?: Array<{ owner: string; task: string; deadline?: string | null }>;
      decisions?: string[];
      followUps?: string[];
    } | null;

    if (!payload) {
      return {
        success: false,
        provider: this.provider,
        error: "No payload to deliver",
      };
    }

    const blocks = formatSlackBlocks({
      title: payload.title ?? artifact.title ?? "Meeting Summary",
      date: payload.date ?? null,
      attendees: payload.attendees ?? [],
      summary: payload.summary ?? artifact.summaryText ?? "",
      actionItems: payload.actionItems ?? [],
      decisions: payload.decisions ?? [],
      followUps: payload.followUps ?? [],
    });

    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({
          channel: slackUserId,
          text: `Meeting Summary: ${artifact.title ?? "New Summary"}`,
          blocks,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, provider: this.provider };
      }

      lastError = `Slack API error: ${data.error ?? "unknown"}`;
      if (data.error !== "ratelimited" && data.error !== "timeout") break;
    }

    return {
      success: false,
      provider: this.provider,
      error: lastError,
    };
  }
}

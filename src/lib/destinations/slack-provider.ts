import type { MeetingSummaryOutput } from "@/lib/ai/prompts/meeting-summary";
import type { DestinationProvider, DeliveryResult } from "./types";
import { formatSlackBlocks } from "./slack-formatter";
import { getUserConfig } from "@/lib/db/scoped-queries";

export class SlackProvider implements DestinationProvider {
  async deliver(
    payload: MeetingSummaryOutput,
    userId: string
  ): Promise<DeliveryResult> {
    const config = await getUserConfig(userId);
    if (!config?.slackUserId) {
      return {
        success: false,
        destinationName: "SLACK",
        error: "Slack not connected — visit Settings to connect your account",
      };
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return {
        success: false,
        destinationName: "SLACK",
        error: "SLACK_BOT_TOKEN environment variable is not configured",
      };
    }

    const blocks = formatSlackBlocks(payload);

    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({
          channel: config.slackUserId,
          text: `Meeting Summary: ${payload.title}`,
          blocks,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, destinationName: "SLACK" };
      }

      lastError = `Slack API error: ${data.error ?? "unknown"}`;

      // Only retry on transient errors
      if (data.error !== "ratelimited" && data.error !== "timeout") break;
    }

    console.error(
      JSON.stringify({
        level: "error",
        event: "slack_delivery_failed",
        userId,
        error: lastError,
      })
    );

    return {
      success: false,
      destinationName: "SLACK",
      error: lastError,
    };
  }
}


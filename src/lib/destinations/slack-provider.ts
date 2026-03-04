import type { MeetingSummaryOutput } from "@/lib/ai/prompts/meeting-summary";
import type { DestinationProvider, DeliveryResult } from "./types";
import { formatSlackBlocks } from "./slack-formatter";
import { getUserConfig } from "@/lib/db/scoped-queries";
import { decrypt } from "@/lib/crypto/encryption";

export class SlackProvider implements DestinationProvider {
  async deliver(
    payload: MeetingSummaryOutput,
    userId: string
  ): Promise<DeliveryResult> {
    const config = await getUserConfig(userId);
    if (!config?.encryptedSlackWebhookUrl) {
      return {
        success: false,
        destinationName: "SLACK",
        error: "Slack webhook URL not configured",
      };
    }

    const webhookUrl = decrypt(config.encryptedSlackWebhookUrl);
    const blocks = formatSlackBlocks(payload);

    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Meeting Summary: ${payload.title}`,
          blocks,
        }),
      });

      if (response.ok) {
        return { success: true, destinationName: "SLACK" };
      }

      lastError = `Slack webhook failed (${response.status}): ${await response.text()}`;

      // Only retry on 5xx
      if (response.status < 500) break;
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

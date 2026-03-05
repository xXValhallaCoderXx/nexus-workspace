import type { DestinationProvider } from "./types";
import { DatabaseProvider } from "./database-provider";
import { SlackProvider } from "./slack-provider";
import {
  getEnabledConnectorConfigs,
  getUserConfig,
  createDeliveryLog,
  updateDeliveryLog,
} from "@/lib/db/scoped-queries";
import type { MeetingSummaryPayload } from "@/lib/connectors/payload";
import type { MeetingSummaryOutput } from "@/lib/ai/prompts/meeting-summary";

const providers: Record<string, () => DestinationProvider> = {
  DATABASE: () => new DatabaseProvider(),
  SLACK: () => new SlackProvider(),
};

export function getDestinationProvider(
  destinationType: string
): DestinationProvider {
  const factory = providers[destinationType];
  if (!factory) {
    return new DatabaseProvider(); // Default fallback
  }
  return factory();
}

/**
 * Returns the list of destinations to deliver to based on user config.
 * DATABASE is always included. SLACK is added when slackDmEnabled is true.
 * Additional connectors are resolved from user_connector_config.
 */
export function getEnabledDestinations(config: {
  slackDmEnabled?: boolean;
} | null): string[] {
  const destinations = ["DATABASE"];
  if (config?.slackDmEnabled) {
    destinations.push("SLACK");
  }
  return destinations;
}

/**
 * Delivers a summary to all enabled destinations and logs results.
 * Uses the new delivery_log table for per-destination tracking.
 * Falls back to legacy string-based tracking in destinationDelivered.
 */
export async function deliverToAllDestinations(
  payload: MeetingSummaryOutput,
  userId: string,
  summaryId: string
): Promise<string[]> {
  const config = await getUserConfig(userId);
  const legacyDestinations = getEnabledDestinations(config);
  const deliveredTo: string[] = [];

  // Deliver to legacy destinations (DATABASE, SLACK)
  for (const dest of legacyDestinations) {
    const logEntry = await createDeliveryLog({
      summaryId,
      connectorId: dest.toLowerCase(),
      status: "PENDING",
    });

    const provider = getDestinationProvider(dest);
    const result = await provider.deliver(payload, userId);

    if (result.success) {
      deliveredTo.push(dest);
      await updateDeliveryLog(logEntry.id, {
        status: "DELIVERED",
        deliveredAt: new Date(),
      });
    } else {
      console.error(
        JSON.stringify({
          level: "error",
          event: "destination_delivery_failed",
          userId,
          destination: dest,
          error: result.error,
        })
      );
      await updateDeliveryLog(logEntry.id, {
        status: "FAILED",
        errorMessage: result.error ?? "Unknown error",
      });
    }
  }

  // Deliver to new connector destinations (Attio, ClickUp, etc.)
  const connectorConfigs = await getEnabledConnectorConfigs(userId);
  for (const connectorConfig of connectorConfigs) {
    // Skip connectors already handled by legacy system
    if (["nexus_history", "slack"].includes(connectorConfig.connectorId)) {
      continue;
    }

    const logEntry = await createDeliveryLog({
      summaryId,
      connectorId: connectorConfig.connectorId,
      status: "PENDING",
    });

    try {
      const { getConnectorProvider } = await import("@/lib/connectors/registry");
      const connector = getConnectorProvider(connectorConfig.connectorId);
      if (!connector) {
        await updateDeliveryLog(logEntry.id, {
          status: "FAILED",
          errorMessage: `Unknown connector: ${connectorConfig.connectorId}`,
        });
        continue;
      }

      const { buildPayloadFromLegacy } = await import("@/lib/connectors/payload");
      const fullPayload: MeetingSummaryPayload = buildPayloadFromLegacy(payload, {
        summaryId,
        sourceFileId: "",
        modelUsed: "",
        nexusBaseUrl: process.env.NEXTAUTH_URL ?? "https://nexus.app",
      });

      const deliveryResult = await connector.deliver(fullPayload, {
        connectorId: connectorConfig.connectorId,
        enabled: connectorConfig.enabled,
        configJson: connectorConfig.configJson as Record<string, unknown> | null,
        oauthTokens: null, // Tokens are loaded by connector internally
      });

      if (deliveryResult.success) {
        deliveredTo.push(connectorConfig.connectorId.toUpperCase());
        await updateDeliveryLog(logEntry.id, {
          status: "DELIVERED",
          deliveredAt: new Date(),
        });
      } else {
        await updateDeliveryLog(logEntry.id, {
          status: "FAILED",
          errorMessage: deliveryResult.error ?? "Unknown error",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      await updateDeliveryLog(logEntry.id, {
        status: "FAILED",
        errorMessage: errorMsg,
      });
    }
  }

  return deliveredTo.length > 0 ? deliveredTo : ["DATABASE"];
}

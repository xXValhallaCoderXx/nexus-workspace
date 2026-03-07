import type { ArtifactForDelivery, DestinationConfig } from "./types";
import type { DestinationProvider } from "@/generated/prisma/enums";
import {
  getEnabledDestinationConnections,
  createArtifactDelivery,
  updateArtifactDelivery,
} from "@/lib/db/scoped-queries";
import { NexusHistoryProvider } from "./nexus-history";
import { SlackDestinationProvider } from "./slack-provider";
import { ClickUpDestinationProvider } from "./clickup-provider";
import { decrypt } from "@/lib/crypto/encryption";

const providers = {
  NEXUS_HISTORY: () => new NexusHistoryProvider(),
  SLACK: () => new SlackDestinationProvider(),
  CLICKUP: () => new ClickUpDestinationProvider(),
} as Record<string, () => import("./types").DestinationProviderContract>;

function getProvider(provider: string) {
  const factory = providers[provider];
  return factory ? factory() : null;
}

function decryptTokens(
  encrypted: string | null
): { access_token: string; refresh_token?: string; expires_at?: number } | null {
  if (!encrypted) return null;
  try {
    return JSON.parse(decrypt(encrypted));
  } catch {
    return null;
  }
}

/**
 * Deliver an artifact to all enabled destinations.
 * Always includes NEXUS_HISTORY. Additional destinations come from DestinationConnection records.
 */
export async function deliverArtifact(
  artifact: ArtifactForDelivery,
  userId: string
): Promise<DestinationProvider[]> {
  const deliveredTo: DestinationProvider[] = [];

  // 1. Always deliver to Nexus History
  const nexusDelivery = await createArtifactDelivery({
    artifactId: artifact.id,
    provider: "NEXUS_HISTORY",
    status: "PENDING",
  });

  const nexusProvider = getProvider("NEXUS_HISTORY")!;
  const nexusResult = await nexusProvider.deliver(
    artifact,
    {
      destinationConnectionId: null,
      provider: "NEXUS_HISTORY",
      enabled: true,
      configJson: null,
      oauthTokens: null,
      externalAccountId: null,
    },
    userId
  );

  if (nexusResult.success) {
    deliveredTo.push("NEXUS_HISTORY");
    await updateArtifactDelivery(nexusDelivery.id, {
      status: "DELIVERED",
      deliveredAt: new Date(),
    });
  } else {
    await updateArtifactDelivery(nexusDelivery.id, {
      status: "FAILED",
      errorMessage: nexusResult.error ?? "Unknown error",
    });
  }

  // 2. Deliver to all enabled destination connections
  const connections = await getEnabledDestinationConnections(userId);

  for (const conn of connections) {
    // Skip NEXUS_HISTORY if it appears in connections (already handled)
    if (conn.provider === "NEXUS_HISTORY") continue;

    const provider = getProvider(conn.provider);
    if (!provider) continue;

    const config: DestinationConfig = {
      destinationConnectionId: conn.id,
      provider: conn.provider,
      enabled: conn.enabled,
      configJson: conn.configJson as Record<string, unknown> | null,
      oauthTokens: decryptTokens(conn.oauthTokensEncrypted),
      externalAccountId: conn.externalAccountId,
    };

    if (!provider.validateConfig(config)) continue;

    const delivery = await createArtifactDelivery({
      artifactId: artifact.id,
      destinationConnectionId: conn.id,
      provider: conn.provider,
      status: "PENDING",
    });

    try {
      const result = await provider.deliver(artifact, config, userId);

      if (result.success) {
        deliveredTo.push(conn.provider);
        await updateArtifactDelivery(delivery.id, {
          status: "DELIVERED",
          deliveredAt: new Date(),
          externalId: result.externalId,
          externalUrl: result.externalUrl,
        });
      } else {
        console.error(
          JSON.stringify({
            level: "error",
            event: "destination_delivery_failed",
            userId,
            provider: conn.provider,
            error: result.error,
          })
        );
        await updateArtifactDelivery(delivery.id, {
          status: "FAILED",
          errorMessage: result.error ?? "Unknown error",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(
        JSON.stringify({
          level: "error",
          event: "destination_delivery_exception",
          userId,
          provider: conn.provider,
          error: errorMsg,
        })
      );
      await updateArtifactDelivery(delivery.id, {
        status: "FAILED",
        errorMessage: errorMsg,
      });
    }
  }

  return deliveredTo.length > 0 ? deliveredTo : ["NEXUS_HISTORY"];
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  getArtifactDeliveryById,
  updateArtifactDelivery,
  getDestinationConnection,
} from "@/lib/db/scoped-queries";
import { NexusHistoryProvider } from "@/lib/destinations/nexus-history";
import { SlackDestinationProvider } from "@/lib/destinations/slack-provider";
import { ClickUpDestinationProvider } from "@/lib/destinations/clickup-provider";
import type { ArtifactForDelivery, DestinationConfig } from "@/lib/destinations/types";
import type { DestinationProvider } from "@/generated/prisma/enums";
import { decrypt } from "@/lib/crypto/encryption";

const providers: Record<string, () => import("@/lib/destinations/types").DestinationProviderContract> = {
  NEXUS_HISTORY: () => new NexusHistoryProvider(),
  SLACK: () => new SlackDestinationProvider(),
  CLICKUP: () => new ClickUpDestinationProvider(),
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const delivery = await getArtifactDeliveryById(id);
  if (!delivery || delivery.artifact.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (delivery.status !== "FAILED") {
    return NextResponse.json(
      { error: "Only failed deliveries can be retried" },
      { status: 400 }
    );
  }

  const providerFactory = providers[delivery.provider];
  if (!providerFactory) {
    return NextResponse.json({ error: "Provider not found" }, { status: 400 });
  }

  const provider = providerFactory();

  // Build destination config
  let config: DestinationConfig;
  if (delivery.destinationConnectionId) {
    const conn = await getDestinationConnection(
      session.user.id,
      delivery.provider as DestinationProvider
    );
    if (!conn) {
      return NextResponse.json(
        { error: "Destination not configured" },
        { status: 400 }
      );
    }
    let oauthTokens = null;
    if (conn.oauthTokensEncrypted) {
      try {
        oauthTokens = JSON.parse(decrypt(conn.oauthTokensEncrypted));
      } catch {
        return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
      }
    }
    config = {
      destinationConnectionId: conn.id,
      provider: conn.provider,
      enabled: conn.enabled,
      configJson: conn.configJson as Record<string, unknown> | null,
      oauthTokens,
      externalAccountId: conn.externalAccountId,
    };
  } else {
    config = {
      destinationConnectionId: null,
      provider: delivery.provider,
      enabled: true,
      configJson: null,
      oauthTokens: null,
      externalAccountId: null,
    };
  }

  const artifact: ArtifactForDelivery = {
    id: delivery.artifact.id,
    artifactType: delivery.artifact.artifactType as ArtifactForDelivery["artifactType"],
    title: delivery.artifact.title,
    summaryText: delivery.artifact.summaryText ?? null,
    payloadJson: delivery.artifact.payloadJson as Record<string, unknown> | null,
    sourceRefsJson: delivery.artifact.sourceRefsJson as Record<string, unknown> | null,
  };

  try {
    const result = await provider.deliver(artifact, config, session.user.id);

    await updateArtifactDelivery(id, {
      status: result.success ? "DELIVERED" : "FAILED",
      errorMessage: result.error ?? null,
      externalId: result.externalId ?? null,
      externalUrl: result.externalUrl ?? null,
      deliveredAt: result.success ? new Date() : undefined,
      retryCount: { increment: 1 },
    });

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateArtifactDelivery(id, {
      status: "FAILED",
      errorMessage,
      retryCount: { increment: 1 },
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

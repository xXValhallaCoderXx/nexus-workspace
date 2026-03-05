import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db/prisma";
import { getConnectorProvider } from "@/lib/connectors/registry";
import { getConnectorTokens } from "@/lib/connectors/connector-auth";
import { buildPayloadFromLegacy } from "@/lib/connectors/payload";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the delivery log entry and verify ownership
  const deliveryLog = await prisma.deliveryLog.findFirst({
    where: { id },
    include: {
      summary: { select: { id: true, userId: true, resultPayload: true, sourceFileName: true, sourceFileId: true } },
    },
  });

  if (!deliveryLog || deliveryLog.summary.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (deliveryLog.status !== "FAILED") {
    return NextResponse.json({ error: "Only failed deliveries can be retried" }, { status: 400 });
  }

  const connector = getConnectorProvider(deliveryLog.connectorId);
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 400 });
  }

  // Get connector config for this user
  const connectorConfig = await prisma.userConnectorConfig.findFirst({
    where: {
      userId: session.user.id,
      connectorId: deliveryLog.connectorId,
      enabled: true,
    },
  });

  if (!connectorConfig) {
    return NextResponse.json({ error: "Connector not configured" }, { status: 400 });
  }

  try {
    const tokens = await getConnectorTokens(session.user.id, deliveryLog.connectorId);
    if (!tokens) {
      return NextResponse.json({ error: "No valid tokens" }, { status: 400 });
    }

    const legacyPayload = deliveryLog.summary.resultPayload as Record<string, unknown> | null;
    if (!legacyPayload) {
      return NextResponse.json({ error: "No payload to deliver" }, { status: 400 });
    }

    const payload = buildPayloadFromLegacy(
      legacyPayload as {
        title: string;
        date?: string | null;
        attendees: string[];
        summary: string;
        actionItems: Array<{ owner: string; task: string; deadline?: string | null }>;
        decisions: string[];
        followUps: string[];
      },
      {
        summaryId: deliveryLog.summary.id,
        sourceFileId: deliveryLog.summary.sourceFileId,
        modelUsed: "unknown",
        nexusBaseUrl: process.env.NEXTAUTH_URL ?? "https://app.nexus.com",
      }
    );

    const configJson = connectorConfig.configJson as Record<string, unknown> | null;
    const result = await connector.deliver(payload, {
      connectorId: deliveryLog.connectorId,
      enabled: true,
      configJson: configJson,
      oauthTokens: tokens,
    });

    await prisma.deliveryLog.update({
      where: { id },
      data: {
        status: result.success ? "DELIVERED" : "FAILED",
        errorMessage: result.error ?? null,
        deliveredAt: result.success ? new Date() : null,
        retryCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await prisma.deliveryLog.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage,
        retryCount: { increment: 1 },
      },
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

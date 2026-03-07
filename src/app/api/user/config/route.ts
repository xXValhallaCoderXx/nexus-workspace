import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth/get-session";
import {
  getUserConfig,
  upsertUserConfig,
  getDestinationConnection,
  upsertDestinationConnection,
} from "@/lib/db/scoped-queries";
import { encrypt } from "@/lib/crypto/encryption";

const updateConfigSchema = z.object({
  meetingSummariesEnabled: z.boolean().optional(),
  slackDmEnabled: z.boolean().optional(),
  openRouterApiKey: z.string().nullable().optional(),
  customSystemPrompt: z.string().nullable().optional(),
  dismissedConnectorNudge: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [config, slackConn] = await Promise.all([
    getUserConfig(session.user.id),
    getDestinationConnection(session.user.id, "SLACK"),
  ]);

  return NextResponse.json({
    meetingSummariesEnabled: config?.meetingSummariesEnabled ?? false,
    slackDmEnabled: slackConn?.enabled ?? false,
    hasOpenRouterKey: !!config?.encryptedOpenRouterKey,
    hasSlackConnected: slackConn?.status === "CONNECTED",
    customSystemPrompt: config?.customSystemPrompt ?? null,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Handle UserConfig fields
  const configData: Record<string, unknown> = {};
  if (parsed.data.meetingSummariesEnabled !== undefined) {
    configData.meetingSummariesEnabled = parsed.data.meetingSummariesEnabled;
  }
  if (parsed.data.openRouterApiKey !== undefined) {
    configData.encryptedOpenRouterKey = parsed.data.openRouterApiKey
      ? encrypt(parsed.data.openRouterApiKey)
      : null;
  }
  if (parsed.data.customSystemPrompt !== undefined) {
    configData.customSystemPrompt = parsed.data.customSystemPrompt;
  }
  if (parsed.data.dismissedConnectorNudge !== undefined) {
    configData.dismissedConnectorNudge = parsed.data.dismissedConnectorNudge;
  }

  if (Object.keys(configData).length > 0) {
    await upsertUserConfig(session.user.id, configData);
  }

  // Handle Slack DM toggle via DestinationConnection
  if (parsed.data.slackDmEnabled !== undefined) {
    await upsertDestinationConnection(session.user.id, "SLACK", {
      enabled: parsed.data.slackDmEnabled,
    });
  }

  return NextResponse.json({ success: true });
}

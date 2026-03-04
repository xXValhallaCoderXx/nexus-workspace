import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth/get-session";
import { getUserConfig, upsertUserConfig } from "@/lib/db/scoped-queries";
import { encrypt } from "@/lib/crypto/encryption";

const updateConfigSchema = z.object({
  meetingSummariesEnabled: z.boolean().optional(),
  selectedDestination: z.enum(["DATABASE", "SLACK"]).optional(),
  slackWebhookUrl: z.string().url().optional(),
  openRouterApiKey: z.string().nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getUserConfig(session.user.id);

  return NextResponse.json({
    meetingSummariesEnabled: config?.meetingSummariesEnabled ?? false,
    selectedDestination: config?.selectedDestination ?? "DATABASE",
    hasOpenRouterKey: !!config?.encryptedOpenRouterKey,
    hasSlackWebhook: !!config?.encryptedSlackWebhookUrl,
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

  const data: Record<string, unknown> = {};

  if (parsed.data.meetingSummariesEnabled !== undefined) {
    data.meetingSummariesEnabled = parsed.data.meetingSummariesEnabled;
  }
  if (parsed.data.selectedDestination !== undefined) {
    data.selectedDestination = parsed.data.selectedDestination;
  }
  if (parsed.data.slackWebhookUrl !== undefined) {
    data.encryptedSlackWebhookUrl = encrypt(parsed.data.slackWebhookUrl);
  }
  if (parsed.data.openRouterApiKey !== undefined) {
    data.encryptedOpenRouterKey = parsed.data.openRouterApiKey
      ? encrypt(parsed.data.openRouterApiKey)
      : null;
  }

  await upsertUserConfig(session.user.id, data);

  return NextResponse.json({ success: true });
}

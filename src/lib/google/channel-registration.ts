import { randomUUID, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getDriveClient } from "./get-drive-client";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function registerPushChannel(userId: string) {
  const drive = await getDriveClient(userId);
  const channelId = randomUUID();
  const watchToken = randomBytes(32).toString("hex");
  const expiration = Date.now() + SEVEN_DAYS_MS;

  const webhookUrl = process.env.WEBHOOK_BASE_URL;
  if (!webhookUrl) {
    throw new Error("WEBHOOK_BASE_URL environment variable is not set");
  }

  const response = await drive.files.watch({
    fileId: "root",
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: `${webhookUrl}/api/webhooks/google-drive`,
      token: watchToken,
      expiration: String(expiration),
    },
  });

  const channel = await prisma.pushChannel.create({
    data: {
      userId,
      channelId,
      resourceId: response.data.resourceId!,
      watchToken,
      expiration: new Date(Number(response.data.expiration)),
    },
  });

  return channel;
}

export async function stopChannel(
  userId: string,
  channelId: string,
  resourceId: string
) {
  const drive = await getDriveClient(userId);

  await drive.channels.stop({
    requestBody: {
      id: channelId,
      resourceId,
    },
  });

  await prisma.pushChannel.deleteMany({
    where: { channelId, userId },
  });
}

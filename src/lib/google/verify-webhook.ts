import { timingSafeEqual } from "crypto";

export function verifyGoogleDriveWebhook(
  channelToken: string | null,
  expectedToken: string
): boolean {
  if (!channelToken) return false;
  if (channelToken.length !== expectedToken.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(channelToken, "utf8"),
      Buffer.from(expectedToken, "utf8")
    );
  } catch {
    return false;
  }
}

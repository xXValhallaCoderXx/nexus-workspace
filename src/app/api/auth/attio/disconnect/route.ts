import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { deleteConnectorConfig, getUserConnectorConfig } from "@/lib/db/scoped-queries";
import { decrypt } from "@/lib/crypto/encryption";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Attempt to revoke the token at Attio before deleting
  const config = await getUserConnectorConfig(session.user.id, "attio");
  if (config?.oauthTokens) {
    try {
      const tokens = JSON.parse(decrypt(config.oauthTokens));
      await fetch("https://app.attio.com/oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokens.access_token }),
      });
    } catch {
      // Best-effort revocation — continue even if it fails
    }
  }

  await deleteConnectorConfig(session.user.id, "attio");

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertDestinationConnection } from "@/lib/db/scoped-queries";
import { encrypt } from "@/lib/crypto/encryption";
import {
  verifyOAuthState,
  getAppBaseUrl,
} from "@/lib/auth/oauth-helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appBase = getAppBaseUrl();
  const stateResult = verifyOAuthState(state);

  if (error) {
    return NextResponse.redirect(
      new URL(
        stateResult?.returnTo ?? "/dashboard/settings?error=clickup_denied",
        appBase
      )
    );
  }

  // Verify HMAC-signed state (works across domains — no cookie needed)
  const session = await getSession();
  const userId = session?.user?.id ?? stateResult?.userId;

  if (!userId || !stateResult) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=clickup_state_mismatch", appBase)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        stateResult?.returnTo ?? "/dashboard/settings?error=clickup_no_code",
        appBase
      )
    );
  }

  // Exchange code for token
  const tokenParams = new URLSearchParams({
    client_id: process.env.CLICKUP_CLIENT_ID!,
    client_secret: process.env.CLICKUP_CLIENT_SECRET!,
    code,
  });

  const tokenRes = await fetch(
    `https://api.clickup.com/api/v2/oauth/token?${tokenParams.toString()}`,
    { method: "POST" }
  );

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "clickup_oauth_token_exchange_failed",
        userId,
        error: tokenData.err ?? tokenRes.statusText,
      })
    );
    return NextResponse.redirect(
      new URL(
        stateResult.returnTo ?? "/dashboard/settings?error=clickup_token_failed",
        appBase
      )
    );
  }

  const encryptedTokens = encrypt(
    JSON.stringify({ access_token: tokenData.access_token })
  );

  await upsertDestinationConnection(userId, "CLICKUP", {
    oauthTokensEncrypted: encryptedTokens,
    status: "CONNECTED",
    displayName: "ClickUp",
  });

  return NextResponse.redirect(
    new URL(
      stateResult.returnTo ?? "/dashboard/settings?connected=clickup",
      appBase
    )
  );
}

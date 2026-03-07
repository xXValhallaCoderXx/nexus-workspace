import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertDestinationConnection } from "@/lib/db/scoped-queries";
import {
  buildOAuthRedirectUri,
  verifyOAuthState,
  getAppBaseUrl,
} from "@/lib/auth/oauth-helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appBase = getAppBaseUrl();

  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_denied", appBase)
    );
  }

  // Verify HMAC-signed state (works across domains — no cookie needed)
  const stateResult = verifyOAuthState(state);
  // Also try session for same-domain flows
  const session = await getSession();
  const userId = session?.user?.id ?? stateResult?.userId;

  if (!userId || !stateResult) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_state_mismatch", appBase)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_no_code", appBase)
    );
  }

  // Exchange code for tokens via Slack's OpenID Connect token endpoint
  const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      redirect_uri: buildOAuthRedirectUri("SLACK", "/api/auth/slack/callback"),
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "slack_oauth_token_exchange_failed",
        userId,
        error: tokenData.error,
      })
    );
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_token_failed", appBase)
    );
  }

  const slackUserId: string =
    tokenData["https://slack.com/user_id"] ?? tokenData.sub;

  if (!slackUserId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_no_user_id", appBase)
    );
  }

  // Store in DestinationConnection
  await upsertDestinationConnection(userId, "SLACK", {
    externalAccountId: slackUserId,
    status: "CONNECTED",
    enabled: true,
    displayName: "Slack DM",
  });

  return NextResponse.redirect(
    new URL("/dashboard/settings?connected=slack", appBase)
  );
}

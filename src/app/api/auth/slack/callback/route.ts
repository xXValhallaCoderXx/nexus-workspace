import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertDestinationConnection } from "@/lib/db/scoped-queries";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/?error=unauthenticated", request.url)
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_denied", request.url)
    );
  }

  // CSRF check
  const cookieStore = await cookies();
  const savedState = cookieStore.get("slack_oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_state_mismatch", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_no_code", request.url)
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
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/slack/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "slack_oauth_token_exchange_failed",
        userId: session.user.id,
        error: tokenData.error,
      })
    );
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_token_failed", request.url)
    );
  }

  const slackUserId: string =
    tokenData["https://slack.com/user_id"] ?? tokenData.sub;

  if (!slackUserId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=slack_no_user_id", request.url)
    );
  }

  // Store in DestinationConnection
  await upsertDestinationConnection(session.user.id, "SLACK", {
    externalAccountId: slackUserId,
    status: "CONNECTED",
    enabled: true,
    displayName: "Slack DM",
  });

  const response = NextResponse.redirect(
    new URL("/dashboard/settings?connected=slack", request.url)
  );
  response.cookies.set("slack_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}

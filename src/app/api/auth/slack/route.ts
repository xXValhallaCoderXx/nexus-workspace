import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  buildOAuthRedirectUri,
  createOAuthState,
} from "@/lib/auth/oauth-helpers";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = createOAuthState(session.user.id);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "openid profile email",
    redirect_uri: buildOAuthRedirectUri("SLACK", "/api/auth/slack/callback"),
    state,
  });

  return NextResponse.redirect(
    `https://slack.com/openid/connect/authorize?${params.toString()}`
  );
}

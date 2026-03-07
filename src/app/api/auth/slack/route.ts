import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  buildOAuthRedirectUri,
  createOAuthState,
} from "@/lib/auth/oauth-helpers";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") ?? undefined;

  const state = createOAuthState(session.user.id, { returnTo });

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    user_scope: "search:read",
    redirect_uri: buildOAuthRedirectUri("SLACK", "/api/auth/slack/callback"),
    state,
  });

  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
}

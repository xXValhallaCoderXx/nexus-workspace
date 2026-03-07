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
    client_id: process.env.CLICKUP_CLIENT_ID!,
    redirect_uri: buildOAuthRedirectUri("CLICKUP", "/api/auth/clickup/callback"),
    state,
  });

  return NextResponse.redirect(
    `https://app.clickup.com/api?${params.toString()}`
  );
}

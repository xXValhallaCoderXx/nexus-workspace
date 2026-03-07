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
    client_id: process.env.CLICKUP_CLIENT_ID!,
    redirect_uri: buildOAuthRedirectUri("CLICKUP", "/api/auth/clickup/callback"),
    state,
  });

  return NextResponse.redirect(
    `https://app.clickup.com/api?${params.toString()}`
  );
}

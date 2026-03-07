import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "openid profile email",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/slack/callback`,
    state,
  });

  const response = NextResponse.redirect(
    `https://slack.com/openid/connect/authorize?${params.toString()}`
  );

  // Short-lived CSRF cookie — verified in callback
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}

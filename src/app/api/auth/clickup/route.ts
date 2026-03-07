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
    client_id: process.env.CLICKUP_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/clickup/callback`,
    state,
  });

  const response = NextResponse.redirect(
    `https://app.clickup.com/api?${params.toString()}`
  );

  response.cookies.set("clickup_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}

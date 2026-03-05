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
    client_id: process.env.ATTIO_CLIENT_ID!,
    redirect_uri: `${process.env.WEBHOOK_BASE_URL}/api/auth/attio/callback`,
    state,
  });

  const response = NextResponse.redirect(
    `https://app.attio.com/authorize?${params.toString()}`
  );

  response.cookies.set("attio_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}

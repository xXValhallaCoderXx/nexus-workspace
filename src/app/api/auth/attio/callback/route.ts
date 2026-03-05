import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertConnectorConfig } from "@/lib/db/scoped-queries";
import { encrypt } from "@/lib/crypto/encryption";
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
      new URL("/dashboard/settings?error=attio_denied", request.url)
    );
  }

  // CSRF check
  const cookieStore = await cookies();
  const savedState = cookieStore.get("attio_oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=attio_state_mismatch", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=attio_no_code", request.url)
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://app.attio.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: process.env.ATTIO_CLIENT_ID!,
      client_secret: process.env.ATTIO_CLIENT_SECRET!,
      redirect_uri: `${process.env.WEBHOOK_BASE_URL}/api/auth/attio/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "attio_oauth_token_exchange_failed",
        userId: session.user.id,
        error: tokenData.error ?? tokenRes.statusText,
      })
    );
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=attio_token_failed", request.url)
    );
  }

  // Store encrypted tokens in connector config
  const encryptedTokens = encrypt(
    JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in
        ? Math.floor(Date.now() / 1000) + tokenData.expires_in
        : undefined,
    })
  );

  await upsertConnectorConfig(session.user.id, "attio", {
    oauthTokens: encryptedTokens,
    status: "CONNECTED",
  });

  const response = NextResponse.redirect(
    new URL("/dashboard/settings?connected=attio", request.url)
  );
  response.cookies.set("attio_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}

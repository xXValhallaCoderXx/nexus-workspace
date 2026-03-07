import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertDestinationConnection } from "@/lib/db/scoped-queries";
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
      new URL("/dashboard/settings?error=clickup_denied", request.url)
    );
  }

  // CSRF check
  const cookieStore = await cookies();
  const savedState = cookieStore.get("clickup_oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=clickup_state_mismatch", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=clickup_no_code", request.url)
    );
  }

  // Exchange code for token
  const tokenParams = new URLSearchParams({
    client_id: process.env.CLICKUP_CLIENT_ID!,
    client_secret: process.env.CLICKUP_CLIENT_SECRET!,
    code,
  });

  const tokenRes = await fetch(
    `https://api.clickup.com/api/v2/oauth/token?${tokenParams.toString()}`,
    { method: "POST" }
  );

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "clickup_oauth_token_exchange_failed",
        userId: session.user.id,
        error: tokenData.err ?? tokenRes.statusText,
      })
    );
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=clickup_token_failed", request.url)
    );
  }

  const encryptedTokens = encrypt(
    JSON.stringify({ access_token: tokenData.access_token })
  );

  await upsertDestinationConnection(session.user.id, "CLICKUP", {
    oauthTokensEncrypted: encryptedTokens,
    status: "CONNECTED",
    displayName: "ClickUp",
  });

  const response = NextResponse.redirect(
    new URL("/dashboard/settings?connected=clickup", request.url)
  );
  response.cookies.set("clickup_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}

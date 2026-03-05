import { getUserConnectorConfig } from "@/lib/db/scoped-queries";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { upsertConnectorConfig } from "@/lib/db/scoped-queries";

export interface ConnectorTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

/**
 * Retrieves and decrypts OAuth tokens for a connector.
 * Returns null if not connected or tokens are missing.
 */
export async function getConnectorTokens(
  userId: string,
  connectorId: string
): Promise<ConnectorTokens | null> {
  const config = await getUserConnectorConfig(userId, connectorId);
  if (!config?.oauthTokens) return null;

  try {
    return JSON.parse(decrypt(config.oauthTokens)) as ConnectorTokens;
  } catch {
    return null;
  }
}

/**
 * Refreshes Attio OAuth tokens using the refresh token.
 * Returns new tokens or null if refresh fails.
 */
export async function refreshAttioToken(
  userId: string,
  refreshToken: string
): Promise<ConnectorTokens | null> {
  const res = await fetch("https://app.attio.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.ATTIO_CLIENT_ID!,
      client_secret: process.env.ATTIO_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.access_token) return null;

  const tokens: ConnectorTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: data.expires_in
      ? Math.floor(Date.now() / 1000) + data.expires_in
      : undefined,
  };

  // Persist refreshed tokens
  await upsertConnectorConfig(userId, "attio", {
    oauthTokens: encrypt(JSON.stringify(tokens)),
  });

  return tokens;
}

/**
 * Makes an authenticated API call to a connector, handling token refresh for Attio.
 */
export async function connectorFetch(
  userId: string,
  connectorId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const tokens = await getConnectorTokens(userId, connectorId);
  if (!tokens) {
    throw new Error(`No tokens found for connector ${connectorId}`);
  }

  const makeRequest = (accessToken: string) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

  let response = await makeRequest(tokens.access_token);

  // Auto-refresh for Attio on 401
  if (response.status === 401 && connectorId === "attio" && tokens.refresh_token) {
    const newTokens = await refreshAttioToken(userId, tokens.refresh_token);
    if (newTokens) {
      response = await makeRequest(newTokens.access_token);
    } else {
      // Refresh failed — mark as expired
      await upsertConnectorConfig(userId, "attio", { status: "EXPIRED" });
    }
  }

  return response;
}

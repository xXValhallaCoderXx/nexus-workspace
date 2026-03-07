import { getUserConnectorConfig } from "@/lib/db/scoped-queries";
import { decrypt } from "@/lib/crypto/encryption";

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
 * Makes an authenticated API call to a connector.
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

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
      ...options.headers,
    },
  });
}

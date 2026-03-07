import type {
  DestinationProvider as DestinationProviderEnum,
  ArtifactType,
} from "@/generated/prisma/enums";

export interface ArtifactForDelivery {
  id: string;
  artifactType: ArtifactType;
  title: string | null;
  summaryText: string | null;
  payloadJson: Record<string, unknown> | null;
  sourceRefsJson: Record<string, unknown> | null;
}

export interface DestinationConfig {
  destinationConnectionId: string | null;
  provider: DestinationProviderEnum;
  enabled: boolean;
  configJson: Record<string, unknown> | null;
  oauthTokens: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  } | null;
  externalAccountId: string | null;
}

export interface DeliveryResult {
  success: boolean;
  provider: DestinationProviderEnum;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

export interface DestinationProviderContract {
  readonly provider: DestinationProviderEnum;

  /** Check if the destination connection is valid */
  validateConfig(config: DestinationConfig): boolean;

  /** Deliver an artifact to this destination */
  deliver(
    artifact: ArtifactForDelivery,
    config: DestinationConfig,
    userId: string
  ): Promise<DeliveryResult>;
}

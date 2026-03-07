import type { SourceProvider as SourceProviderEnum } from "@/generated/prisma/enums";

export interface NormalizedSourceEvent {
  userId: string;
  sourceConnectionId: string;
  provider: SourceProviderEnum;
  eventType: string;
  externalEventId?: string;
  dedupeKey?: string;
  rawPayload?: Record<string, unknown>;
  normalizedMetadata?: Record<string, unknown>;
}

export interface NormalizedSourceItem {
  userId: string;
  sourceConnectionId: string;
  provider: SourceProviderEnum;
  itemType: string;
  externalItemId: string;
  title?: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SourceProviderContract {
  readonly provider: SourceProviderEnum;

  /** Verify an incoming webhook or poll response is authentic */
  verifyRequest(request: Request, connectionMeta: unknown): boolean;

  /** Resolve the user and source connection from an incoming request */
  resolveConnection(request: Request): Promise<{
    userId: string;
    sourceConnectionId: string;
  } | null>;

  /** Normalize raw provider event into canonical SourceEvent data */
  normalizeEvent(
    request: Request,
    context: { userId: string; sourceConnectionId: string }
  ): Promise<NormalizedSourceEvent>;

  /** Build source items from a normalized event */
  buildSourceItems(
    userId: string,
    sourceConnectionId: string,
    eventMetadata: Record<string, unknown>
  ): Promise<NormalizedSourceItem[]>;
}

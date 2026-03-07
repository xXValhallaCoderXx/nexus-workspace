import type { SourceProviderContract } from "./types";

const providers: Record<string, () => SourceProviderContract> = {};

/**
 * Register a source provider factory.
 * Called at module level by each provider implementation.
 */
export function registerSourceProvider(
  connectorId: string,
  factory: () => SourceProviderContract
): void {
  providers[connectorId] = factory;
}

/**
 * Get a source provider instance by connector ID.
 * Returns null if no provider is registered for the given ID.
 */
export function getSourceProvider(
  connectorId: string
): SourceProviderContract | null {
  const factory = providers[connectorId];
  return factory ? factory() : null;
}

/**
 * Get all registered connector IDs.
 */
export function getRegisteredConnectorIds(): string[] {
  return Object.keys(providers);
}

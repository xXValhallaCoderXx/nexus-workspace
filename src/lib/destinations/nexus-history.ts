import type {
  DestinationProviderContract,
  ArtifactForDelivery,
  DestinationConfig,
  DeliveryResult,
} from "./types";

export class NexusHistoryProvider implements DestinationProviderContract {
  readonly provider = "NEXUS_HISTORY" as const;

  validateConfig(_config: DestinationConfig): boolean {
    return true;
  }

  async deliver(
    _artifact: ArtifactForDelivery,
    _config: DestinationConfig,
    _userId: string
  ): Promise<DeliveryResult> {
    // Nexus History is stored via the Artifact record itself.
    // This provider confirms delivery for tracking purposes.
    return { success: true, provider: this.provider };
  }
}

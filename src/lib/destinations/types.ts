import type { MeetingSummaryOutput } from "@/lib/ai/prompts/meeting-summary";

export interface DeliveryResult {
  success: boolean;
  destinationName: string;
  externalId?: string;
  error?: string;
}

export interface DestinationProvider {
  deliver(
    payload: MeetingSummaryOutput,
    userId: string
  ): Promise<DeliveryResult>;
}

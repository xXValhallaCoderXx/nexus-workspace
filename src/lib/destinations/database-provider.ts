import type { MeetingSummaryOutput } from "@/lib/ai/prompts/meeting-summary";
import type { DestinationProvider, DeliveryResult } from "./types";

export class DatabaseProvider implements DestinationProvider {
  async deliver(
    payload: MeetingSummaryOutput,
    _userId: string
  ): Promise<DeliveryResult> {
    // The payload is stored in JobHistory.resultPayload by the worker.
    // This provider is a no-op beyond confirming delivery.
    return {
      success: true,
      destinationName: "DATABASE",
    };
  }
}

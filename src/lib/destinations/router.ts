import type { DestinationProvider } from "./types";
import { DatabaseProvider } from "./database-provider";
import { SlackProvider } from "./slack-provider";

const providers: Record<string, () => DestinationProvider> = {
  DATABASE: () => new DatabaseProvider(),
  SLACK: () => new SlackProvider(),
};

export function getDestinationProvider(
  destinationType: string
): DestinationProvider {
  const factory = providers[destinationType];
  if (!factory) {
    return new DatabaseProvider(); // Default fallback
  }
  return factory();
}

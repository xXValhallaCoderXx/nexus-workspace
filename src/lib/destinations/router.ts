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

/**
 * Returns the list of destinations to deliver to based on user config.
 * DATABASE is always included. SLACK is added when slackDmEnabled is true.
 */
export function getEnabledDestinations(config: {
  slackDmEnabled?: boolean;
} | null): string[] {
  const destinations = ["DATABASE"];
  if (config?.slackDmEnabled) {
    destinations.push("SLACK");
  }
  return destinations;
}

import { getSession } from "@/lib/auth/get-session";
import {
  getDestinationConnections,
  getUserConfig,
} from "@/lib/db/scoped-queries";
import { OnboardingConfigureStep } from "@/components/onboarding/onboarding-configure-step";

export default async function OnboardingConfigurePage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [config, destinationConnections] = await Promise.all([
    getUserConfig(userId),
    getDestinationConnections(userId),
  ]);

  const slack = destinationConnections.find((connection) => connection.provider === "SLACK");
  const clickup = destinationConnections.find((connection) => connection.provider === "CLICKUP");

  return (
    <OnboardingConfigureStep
      userImage={session!.user.image}
      meetingSummariesEnabled={config?.meetingSummariesEnabled ?? false}
      slackDmEnabled={slack?.enabled ?? false}
      quietModeEnabled={config?.quietModeEnabled ?? false}
      hasSlackConnected={slack?.status === "CONNECTED"}
      clickup={
        clickup
          ? {
              status: clickup.status,
              enabled: clickup.enabled,
              configJson: clickup.configJson as Record<string, unknown> | null,
            }
          : null
      }
    />
  );
}

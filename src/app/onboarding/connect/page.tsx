import { getSession } from "@/lib/auth/get-session";
import {
  getDestinationConnections,
  getUserPushChannels,
} from "@/lib/db/scoped-queries";
import { OnboardingConnectStep } from "@/components/onboarding/onboarding-connect-step";

export default async function OnboardingConnectPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [channels, destinationConnections] = await Promise.all([
    getUserPushChannels(userId),
    getDestinationConnections(userId),
  ]);

  const activeChannel = channels.find((channel) => channel.expiration > new Date());
  const slack = destinationConnections.find((connection) => connection.provider === "SLACK");
  const clickup = destinationConnections.find((connection) => connection.provider === "CLICKUP");

  return (
    <OnboardingConnectStep
      email={session!.user.email}
      userImage={session!.user.image}
      channelActive={!!activeChannel}
      channelExpiration={activeChannel?.expiration.toISOString()}
      slack={
        slack
          ? {
              status: slack.status,
              enabled: slack.enabled,
              configJson: slack.configJson as Record<string, unknown> | null,
            }
          : null
      }
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

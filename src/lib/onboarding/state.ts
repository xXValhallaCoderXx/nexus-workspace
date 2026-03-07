import type { OnboardingStep as OnboardingStepEnum } from "@/generated/prisma/enums";
import { getUserConfig } from "@/lib/db/scoped-queries";

export const ONBOARDING_ROUTE_STEPS = ["connect", "configure"] as const;

export type OnboardingRouteStep = (typeof ONBOARDING_ROUTE_STEPS)[number];

export function routeStepToEnum(step: OnboardingRouteStep): OnboardingStepEnum {
  return step === "configure" ? "CONFIGURE_WORKFLOWS" : "CONNECT_WORKSPACE";
}

export function enumStepToRoute(
  step: OnboardingStepEnum | string | null | undefined
): OnboardingRouteStep {
  return step === "CONFIGURE_WORKFLOWS" ? "configure" : "connect";
}

export function onboardingPath(step: OnboardingRouteStep): string {
  return `/onboarding/${step}`;
}

export async function getOnboardingState(userId: string) {
  const config = await getUserConfig(userId);

  return {
    hasConfig: !!config,
    completed: !!config?.onboardingCompletedAt,
    step: enumStepToRoute(config?.onboardingStep),
  };
}

export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  const state = await getOnboardingState(userId);
  return state.hasConfig && !state.completed;
}

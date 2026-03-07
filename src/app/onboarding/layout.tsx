import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/get-session";
import { getOnboardingState } from "@/lib/onboarding/state";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  const onboardingState = await getOnboardingState(session.user.id);
  if (!onboardingState.hasConfig || onboardingState.completed) {
    redirect("/dashboard");
  }

  return children;
}

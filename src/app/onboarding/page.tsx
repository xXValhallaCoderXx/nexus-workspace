import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getOnboardingState, onboardingPath } from "@/lib/onboarding/state";

export default async function OnboardingIndexPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  const onboardingState = await getOnboardingState(session.user.id);
  if (!onboardingState.hasConfig || onboardingState.completed) {
    redirect("/dashboard");
  }

  redirect(onboardingPath(onboardingState.step));
}

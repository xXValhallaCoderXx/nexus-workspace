import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { Sidebar } from "@/components/layout/sidebar";
import {
  getPendingNotificationCount,
  getProcessingRunCount,
} from "@/lib/db/scoped-queries";
import { onboardingPath, getOnboardingState } from "@/lib/onboarding/state";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  const onboardingState = await getOnboardingState(session.user.id);
  if (onboardingState.hasConfig && !onboardingState.completed) {
    redirect(onboardingPath(onboardingState.step));
  }

  const [processingCount, mentionsCount] = await Promise.all([
    getProcessingRunCount(session.user.id),
    getPendingNotificationCount(session.user.id),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={session.user.name}
        processingCount={processingCount}
        mentionsCount={mentionsCount}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

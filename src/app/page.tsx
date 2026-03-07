import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { SignInButton } from "@/components/auth/sign-in-button";
import { getOnboardingState, onboardingPath } from "@/lib/onboarding/state";

export default async function Home() {
  const session = await getSession();
  if (session?.user) {
    const onboardingState = await getOnboardingState(session.user.id);
    redirect(
      onboardingState.hasConfig && !onboardingState.completed
        ? onboardingPath(onboardingState.step)
        : "/dashboard"
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-text"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.08) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-base font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
              N
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0F172A]">
                Nexus
              </h1>
              <p className="text-[11px] text-muted2">Workspace intelligence</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-border bg-white/80 px-4 py-2 text-xs font-medium text-muted2 shadow-sm sm:block">
            Guided setup after sign-in
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-[1040px] gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit rounded-full border border-[#D8E4FF] bg-[#EEF4FF] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#3158C9]">
                AI-first meeting operations
              </div>
              <h2 className="mt-6 text-5xl font-black tracking-tight text-[#0F172A] sm:text-6xl">
                Bring every transcript, mention, and follow-up into one flow.
              </h2>
              <p className="mt-6 max-w-[560px] text-lg leading-8 text-muted2">
                Nexus connects your meeting transcripts, Slack triage, and
                ClickUp handoff so your team spends less time chasing context
                and more time acting on it.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "Google Drive transcript sync",
                  "Slack mention capture",
                  "ClickUp doc delivery",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-white/90 px-4 py-2 text-sm font-medium text-text shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-border bg-white/90 p-8 shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
              <div className="rounded-2xl border border-[#C9F0D4] bg-[#ECFDF3] px-4 py-3 text-center text-sm font-medium text-[#166534]">
                Secure session with Google OAuth and read-only Drive access
              </div>

              <div className="mt-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#0F172A] text-lg font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)]">
                  N
                </div>
                <h3 className="mt-6 text-3xl font-black tracking-tight text-[#0F172A]">
                  Welcome back
                </h3>
                <p className="mt-3 text-base leading-7 text-muted2">
                  Sign in to continue to your workspace and finish your guided
                  setup.
                </p>
              </div>

              <div className="mt-8">
                <SignInButton />
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-[#F8FAFC] px-5 py-5">
                <div className="text-sm font-semibold text-text">
                  What happens next
                </div>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-muted2">
                  <li>1. Confirm your workspace connections</li>
                  <li>2. Choose which workflows should be active</li>
                  <li>3. Land in the dashboard with everything ready to go</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

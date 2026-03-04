import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { SignInButton } from "@/components/auth/sign-in-button";

export default async function Home() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-extrabold text-white shadow-[0_2px_8px_rgba(91,76,245,0.35)]">
            N
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text">
              Nexus
            </h1>
            <p className="text-[11px] text-muted2">Meeting Intelligence</p>
          </div>
        </div>
        <div className="w-[320px] rounded-[14px] border border-border bg-surface p-8 text-center shadow-card">
          <h2 className="text-[15px] font-bold text-text">Welcome back</h2>
          <p className="mt-1 mb-6 text-xs text-muted2">
            Sign in to access your meeting summaries
          </p>
          <SignInButton />
        </div>
      </div>
    </div>
  );
}

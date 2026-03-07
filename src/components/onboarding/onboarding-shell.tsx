import type { ReactNode } from "react";

interface OnboardingShellProps {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  userImage?: string | null;
}

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  footer,
  userImage,
}: OnboardingShellProps) {
  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-text"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.08) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F172A] text-sm font-black text-white shadow-[0_10px_28px_rgba(15,23,42,0.22)]">
            N
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-[#0F172A]">
              Nexus
            </div>
            <div className="text-[11px] text-muted2">Workspace intelligence</div>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="rounded-full border border-border bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2 shadow-sm">
            Step {step} of 2
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-white shadow-sm">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt="Your profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted2">
                You
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-6 pb-10 pt-3">
        <div className="mx-auto max-w-[860px] text-center">
          <div className="sm:hidden">
            <div className="inline-flex rounded-full border border-border bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted2 shadow-sm">
              Step {step} of 2
            </div>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[#0F172A] sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-[760px] text-lg leading-8 text-muted2">
            {subtitle}
          </p>
        </div>

        <div className="mt-10">{children}</div>

        {footer ? (
          <div className="mx-auto mt-10 max-w-[1120px] border-t border-border/80 pt-8">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

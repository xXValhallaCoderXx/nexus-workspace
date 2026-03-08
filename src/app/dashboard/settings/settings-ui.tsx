"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export type SettingsTone = "neutral" | "brand" | "green" | "amber" | "red";

const itemToneClasses: Record<SettingsTone, string> = {
  neutral: "border-border bg-bg",
  brand: "border-[#DBD8FF] bg-brand-lt",
  green: "border-[#BBF7D0] bg-green-lt",
  amber: "border-[#FDE68A] bg-amber-lt",
  red: "border-[#FECACA] bg-red-lt",
};

const itemIconToneClasses: Record<SettingsTone, string> = {
  neutral: "border-border bg-surface text-brand",
  brand: "border-[#DBD8FF] bg-surface text-brand",
  green: "border-[#BBF7D0] bg-surface text-green",
  amber: "border-[#FDE68A] bg-surface text-amber",
  red: "border-[#FECACA] bg-surface text-red",
};

const noteToneClasses: Record<SettingsTone, string> = {
  neutral: "border-border bg-bg text-muted",
  brand: "border-[#DBD8FF] bg-brand-lt text-brand",
  green: "border-[#BBF7D0] bg-green-lt text-[#047857]",
  amber: "border-[#FDE68A] bg-amber-lt text-[#B45309]",
  red: "border-[#FECACA] bg-red-lt text-[#B91C1C]",
};

const metaToneClasses: Record<SettingsTone, string> = {
  neutral: "border-border bg-surface text-muted",
  brand: "border-[#DBD8FF] bg-white text-brand",
  green: "border-[#BBF7D0] bg-white text-green",
  amber: "border-[#FDE68A] bg-white text-[#B45309]",
  red: "border-[#FECACA] bg-white text-red",
};

export const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-[14px] bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,76,245,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#4A3CE0] hover:shadow-[0_18px_36px_rgba(91,76,245,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-[14px] border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-[#DBD8FF] hover:bg-brand-lt hover:text-brand disabled:cursor-not-allowed disabled:opacity-50";

export const subtleButtonClassName =
  "inline-flex items-center justify-center rounded-[14px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClassName =
  "inline-flex items-center justify-center rounded-[14px] border border-[#FECACA] bg-white px-4 py-2.5 text-sm font-semibold text-red transition-colors hover:border-[#FCA5A5] hover:bg-red-lt disabled:cursor-not-allowed disabled:opacity-50";

export function SettingsPanel({
  icon,
  eyebrow,
  title,
  description,
  badge,
  action,
  children,
  className = "",
  bodyClassName = "p-6",
}: {
  icon: ReactNode;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-[28px] border-border bg-surface shadow-card-md ${className}`}
    >
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#DBD8FF] bg-brand-lt text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              {icon}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
                {eyebrow}
              </div>
              <div className="mt-2 text-[22px] font-black tracking-tight text-text">
                {title}
              </div>
              <div className="mt-2 max-w-2xl text-[14px] leading-7 text-muted">
                {description}
              </div>
            </div>
          </div>
          {(badge || action) && (
            <div className="flex flex-wrap items-center gap-2">{badge}{action}</div>
          )}
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

export function SettingsItem({
  icon,
  title,
  description,
  badge,
  action,
  footer,
  tone = "neutral",
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  tone?: SettingsTone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${itemToneClasses[tone]} ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${itemIconToneClasses[tone]}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">{title}</div>
            <div className="mt-1 text-[13px] leading-6 text-muted">
              {description}
            </div>
          </div>
        </div>
        {(badge || action) && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {badge}
            {action}
          </div>
        )}
      </div>
      {footer && <div className="mt-4 border-t border-black/5 pt-4">{footer}</div>}
    </div>
  );
}

export function SettingsNote({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: SettingsTone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border px-4 py-3 text-[13px] leading-6 ${noteToneClasses[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function SettingsMetaPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: SettingsTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${metaToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

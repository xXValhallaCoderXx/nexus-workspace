"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const workspaceItems: NavItem[] = [
  {
    label: "Integrations",
    href: "/dashboard/settings/integrations",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    label: "Workflows",
    href: "/dashboard/settings/workflows",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    label: "AI Engine",
    href: "/dashboard/settings/ai-engine",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

const accountItems: NavItem[] = [
  {
    label: "Profile",
    href: "/dashboard/settings/profile",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    disabled: true,
  },
  {
    label: "Billing",
    href: "/dashboard/settings/billing",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    disabled: true,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="w-full border-b border-border bg-surface md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      {/* Mobile: horizontal scroll strip */}
      <div className="flex gap-1 overflow-x-auto p-3 md:hidden">
        {[...workspaceItems, ...accountItems].map((item) => (
          <NavPill key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden md:flex md:flex-col md:gap-0.5 md:p-4">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted2">
          Workspace
        </p>
        {workspaceItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <div className="mx-3 my-2.5 h-px bg-border" />

        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted2">
          Account
        </p>
        {accountItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (item.disabled) {
    return (
      <span className="flex cursor-not-allowed items-center gap-2.5 rounded-[9px] px-3 py-[9px] text-[13px] font-medium text-muted2/60">
        <span className="text-muted2/40">{item.icon}</span>
        {item.label}
        <span className="ml-auto rounded bg-bg px-1.5 py-0.5 text-[10px] text-muted2">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-2.5 rounded-[9px] px-3 py-[9px] text-[13px] font-medium transition-colors ${
        active
          ? "bg-brand-lt text-brand"
          : "text-muted hover:bg-surface2 hover:text-text"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand" />
      )}
      <span className={active ? "text-brand" : "text-muted2"}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function NavPill({ item, active }: { item: NavItem; active: boolean }) {
  if (item.disabled) return null;

  return (
    <Link
      href={item.href}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] text-xs font-semibold transition-colors ${
        active
          ? "bg-brand text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)]"
          : "border border-border bg-surface text-muted hover:bg-surface2 hover:text-text"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

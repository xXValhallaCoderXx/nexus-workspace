"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  {
    section: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        label: "Notes",
        href: "/dashboard/notes",
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: "History",
        href: "/dashboard/history",
        showBadge: true,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Account",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 002.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 001 2.6c1.8.4 1.8 2.9 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.8 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-2.9 1.8-3.4 0a1.7 1.7 0 00-2.6-1C6.2 19.8 4.4 18 5.3 16.4a1.7 1.7 0 00-1-2.6c-1.8-.4-1.8-2.9 0-3.4a1.7 1.7 0 001-2.6C4.4 6.2 6.2 4.4 7.7 5.3a1.7 1.7 0 002.6-1z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar({
  userName,
  processingCount,
}: {
  userName?: string | null;
  processingCount?: number;
}) {
  const pathname = usePathname();
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface px-2.5 pb-4">
      {/* Logo */}
      <div className="mb-2 flex items-center gap-[9px] border-b border-border px-2 pb-4 pt-[18px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brand text-[13px] font-extrabold text-white shadow-[0_2px_8px_rgba(91,76,245,0.35)]">
          N
        </div>
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-text">
            Nexus
          </div>
          <div className="text-[10px] text-muted2">Meeting Intelligence</div>
        </div>
      </div>

      {/* Nav */}
      {navItems.map((section) => (
        <div key={section.section} className="mb-1 mt-1.5">
          <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted2">
            {section.section}
          </div>
          {section.items.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-[1px] flex items-center gap-[9px] rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-brand-lt font-semibold text-brand"
                    : "text-muted hover:bg-bg hover:text-text"
                }`}
              >
                {item.icon}
                {item.label}
                {item.showBadge && processingCount ? (
                  <span className="ml-auto rounded-full bg-brand px-1.5 py-[1px] text-[10px] font-bold text-white">
                    {processingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}

      {/* User footer */}
      <div className="mt-auto border-t border-border pt-3">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 transition-colors hover:bg-bg"
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C5CF6] to-brand text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-text">
              {userName ?? "User"}
            </div>
            <div className="text-[11px] text-muted2">Sign out</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

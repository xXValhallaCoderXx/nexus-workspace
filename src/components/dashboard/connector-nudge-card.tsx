"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function ConnectorNudgeCard({
  hasPmConnected,
  meetingCount,
  dismissed,
}: {
  hasPmConnected: boolean;
  meetingCount: number;
  dismissed: boolean;
}) {
  const [hidden, setHidden] = useState(dismissed);

  // Only show when user has 3+ meetings and no PM connected
  if (hidden || meetingCount < 3 || hasPmConnected) {
    return null;
  }

  async function handleDismiss() {
    setHidden(true);
    await fetch("/api/user/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissedConnectorNudge: true }),
    });
  }

  const suggestions: Array<{ name: string; desc: string; href: string }> = [];
  if (!hasPmConnected) {
    suggestions.push({
      name: "ClickUp",
      desc: "Turn meetings into ClickUp docs automatically",
      href: "/api/auth/clickup",
    });
  }

  return (
    <Card>
      <div className="relative px-5 py-4">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-muted2 transition-colors hover:text-text"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand">
          New Integrations
        </div>
        <div className="mb-3 text-xs text-muted2">
          Send your meeting summaries to more tools
        </div>

        <div className="space-y-2">
          {suggestions.map((s) => (
            <Link
              key={s.name}
              href={s.href}
              className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5 transition-colors hover:border-brand/30 hover:bg-brand-lt"
            >
              <div>
                <div className="text-[13px] font-medium text-text">
                  {s.name}
                </div>
                <div className="text-[11px] text-muted2">{s.desc}</div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

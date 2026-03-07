"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nexus-first-delivery-seen";

function getSeenDestinations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function markSeen(dest: string) {
  const seen = getSeenDestinations();
  if (!seen.includes(dest)) {
    seen.push(dest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }
}

const destLabels: Record<string, string> = {
  clickup: "ClickUp",
  SLACK: "Slack",
  slack: "Slack",
};

export function FirstDeliveryBadge({
  destinations,
}: {
  destinations: string[];
}) {
  const [newDest, setNewDest] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = getSeenDestinations();
    // Find the first destination that hasn't been seen yet (skip DATABASE/nexus_history)
    const unseen = destinations.find(
      (d) => !seen.includes(d) && d !== "DATABASE" && d !== "nexus_history"
    );
    if (unseen) {
      setNewDest(unseen);
      setVisible(true);
      markSeen(unseen);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [destinations]);

  if (!visible || !newDest) return null;

  const label = destLabels[newDest] ?? newDest;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-lt px-2.5 py-1 text-[11px] font-semibold text-brand">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      First summary sent to {label}!
    </div>
  );
}

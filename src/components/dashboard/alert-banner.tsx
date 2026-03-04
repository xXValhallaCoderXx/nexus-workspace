"use client";

import { useState } from "react";

export function AlertBanner({
  message,
  errorId,
}: {
  message: string;
  errorId: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  async function handleDismiss() {
    await fetch("/api/user/alerts/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errorId }),
    });
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
      <p className="text-sm text-yellow-800">{message}</p>
      <button
        onClick={handleDismiss}
        className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
      >
        Dismiss
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";

export function ConnectionStatus({
  isConnected,
  channelActive,
  channelExpiration,
}: {
  isConnected: boolean;
  channelActive: boolean;
  channelExpiration?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleReconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/channels/register", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to register channel");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900">Connection Status</h3>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Google Account</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Push Channel</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              channelActive
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {channelActive ? "Active" : "Inactive"}
          </span>
        </div>
        {channelExpiration && (
          <p className="text-xs text-gray-500">
            Expires: {new Date(channelExpiration).toLocaleDateString()}
          </p>
        )}
        {(!channelActive || !isConnected) && (
          <button
            onClick={handleReconnect}
            disabled={loading}
            className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect / Reconnect"}
          </button>
        )}
      </div>
    </div>
  );
}

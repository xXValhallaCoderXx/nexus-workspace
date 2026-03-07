import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

type ConnectorStatusMap = Record<
  string,
  { status: string; enabled: boolean }
>;

export function ConnectionsPanel({
  isConnected,
  channelActive,
  channelExpiration,
  email,
  hasSlackConnected,
  connectorStatus,
}: {
  isConnected: boolean;
  channelActive: boolean;
  channelExpiration?: string;
  email?: string | null;
  hasSlackConnected?: boolean;
  connectorStatus?: ConnectorStatusMap;
}) {
  const clickup = connectorStatus?.["clickup"];

  // Collect all connection rows with problem status first
  const rows: Array<{
    name: string;
    detail: string;
    variant: "connected" | "failed" | "pending" | "active" | "expired";
    label: string;
    hasProblem: boolean;
  }> = [
    {
      name: "Google Account",
      detail: email ?? "Not connected",
      variant: isConnected ? "connected" : "failed",
      label: isConnected ? "Connected" : "Disconnected",
      hasProblem: !isConnected,
    },
    {
      name: "Push Channel",
      detail: channelExpiration
        ? `Expires ${new Date(channelExpiration).toLocaleDateString()}`
        : "No active channel",
      variant: channelActive ? "active" : "pending",
      label: channelActive ? "Active" : "Inactive",
      hasProblem: !channelActive,
    },
  ];

  // Only show connected or problem services in dashboard panel
  if (hasSlackConnected) {
    rows.push({
      name: "Slack",
      detail: "DM delivery",
      variant: "connected",
      label: "Connected",
      hasProblem: false,
    });
  }
  if (clickup) {
    rows.push({
      name: "ClickUp",
      detail: clickup.status === "EXPIRED" ? "Connection needs refresh" : "Meeting docs",
      variant: clickup.status === "CONNECTED" ? "connected" : clickup.status === "EXPIRED" ? "expired" : "pending",
      label: clickup.status === "CONNECTED" ? "Connected" : clickup.status === "EXPIRED" ? "Expired" : "Disconnected",
      hasProblem: clickup.status === "EXPIRED",
    });
  }

  // Sort: problems first, then healthy
  const sorted = [...rows].sort((a, b) => (a.hasProblem === b.hasProblem ? 0 : a.hasProblem ? -1 : 1));
  const hasProblems = sorted.some((r) => r.hasProblem);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            Connections
            {hasProblems && (
              <span className="inline-block h-2 w-2 rounded-full bg-amber" />
            )}
          </span>
        }
        action={
          <Link href="/dashboard/settings" className="text-xs font-semibold text-brand hover:underline">
            Manage &rarr;
          </Link>
        }
      />
      <div className="px-5 py-1.5">
        {sorted.map((row, i) => (
          <div
            key={row.name}
            className={`flex items-center justify-between py-[11px] ${
              i < sorted.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div>
              <div className="text-[13px] font-medium text-text">{row.name}</div>
              <div className="mt-[2px] text-[11px] text-muted2">{row.detail}</div>
            </div>
            <StatusBadge variant={row.variant}>{row.label}</StatusBadge>
          </div>
        ))}
      </div>
    </Card>
  );
}

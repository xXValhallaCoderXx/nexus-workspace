import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function ConnectionsPanel({
  isConnected,
  channelActive,
  channelExpiration,
  email,
}: {
  isConnected: boolean;
  channelActive: boolean;
  channelExpiration?: string;
  email?: string | null;
}) {
  return (
    <Card>
      <CardHeader
        title="Connections"
        action={
          <Link href="/dashboard/settings" className="text-xs font-semibold text-brand hover:underline">
            Manage &rarr;
          </Link>
        }
      />
      <div className="px-5 py-1.5">
        <div className="flex items-center justify-between border-b border-border py-[11px]">
          <div>
            <div className="text-[13px] font-medium text-text">Google Account</div>
            <div className="mt-[2px] text-[11px] text-muted2">
              {email ?? "Not connected"}
            </div>
          </div>
          <StatusBadge variant={isConnected ? "connected" : "failed"}>
            {isConnected ? "Connected" : "Disconnected"}
          </StatusBadge>
        </div>
        <div className="flex items-center justify-between py-[11px]">
          <div>
            <div className="text-[13px] font-medium text-text">Push Channel</div>
            <div className="mt-[2px] text-[11px] text-muted2">
              {channelExpiration
                ? `Expires ${new Date(channelExpiration).toLocaleDateString()}`
                : "No active channel"}
            </div>
          </div>
          <StatusBadge variant={channelActive ? "active" : "pending"}>
            {channelActive ? "Active" : "Inactive"}
          </StatusBadge>
        </div>
      </div>
    </Card>
  );
}

import {
  getDeliveryStatus,
  type DeliveryPreview,
} from "@/lib/utils/workflow-run-display";

const providerMeta = {
  NEXUS_HISTORY: {
    label: "Nexus History",
    short: "N",
    avatarClassName: "bg-brand-lt text-brand",
  },
  SLACK: {
    label: "Slack",
    short: "S",
    avatarClassName: "bg-[#ECFDF3] text-[#15803D]",
  },
  CLICKUP: {
    label: "ClickUp",
    short: "C",
    avatarClassName: "bg-[#F5F3FF] text-[#7C3AED]",
  },
} as const;

const deliveryToneClassNames = {
  delivered: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  failed: "border-[#FECACA] bg-[#FEF2F2] text-red",
  pending: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
} as const;

const deliveryStatusDotClassNames = {
  delivered: "bg-green",
  failed: "bg-red",
  pending: "bg-amber",
} as const;

export function getProviderLabel(provider: string) {
  return providerMeta[provider as keyof typeof providerMeta]?.label ?? provider;
}

function getProviderShort(provider: string) {
  return providerMeta[provider as keyof typeof providerMeta]?.short ?? "?";
}

function getProviderAvatarClassName(provider: string) {
  return (
    providerMeta[provider as keyof typeof providerMeta]?.avatarClassName ??
    "bg-bg text-muted"
  );
}

export function DestinationBadge({
  delivery,
  compact = false,
}: {
  delivery: DeliveryPreview;
  compact?: boolean;
}) {
  const tone = getDeliveryStatus(delivery.status);
  const label = getProviderLabel(delivery.provider);
  const avatarClassName = getProviderAvatarClassName(delivery.provider);

  if (compact) {
    return (
      <span
        title={`${label} · ${tone}`}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border ${deliveryToneClassNames[tone]}`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${avatarClassName}`}
        >
          {getProviderShort(delivery.provider)}
        </span>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${deliveryStatusDotClassNames[tone]}`}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${deliveryToneClassNames[tone]}`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${avatarClassName}`}
      >
        {getProviderShort(delivery.provider)}
      </span>
      {label}
    </span>
  );
}

export function WorkflowRunIcon({
  workflowType,
  status,
  size = "sm",
}: {
  workflowType: string;
  status: string;
  size?: "sm" | "md";
}) {
  const isDigest = workflowType === "SCHEDULED_DIGEST";

  const shellClassName =
    status === "FAILED"
      ? "border-[#FECACA] bg-red-lt text-red"
      : status === "PROCESSING"
        ? "border-[#FDE68A] bg-amber-lt text-amber"
        : isDigest
          ? "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]"
          : "border-brand/10 bg-brand-lt text-brand";

  const sizeClassName =
    size === "md"
      ? "h-12 w-12 rounded-[16px]"
      : "h-11 w-11 rounded-[14px]";

  const iconSize = size === "md" ? 18 : 16;

  return (
    <div
      className={`flex shrink-0 items-center justify-center border ${sizeClassName} ${shellClassName}`}
    >
      {isDigest ? (
        <svg
          width={iconSize}
          height={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7.5h16M6 4.5h12A1.5 1.5 0 0119.5 6v12A1.5 1.5 0 0118 19.5H6A1.5 1.5 0 014.5 18V6A1.5 1.5 0 016 4.5zm2.5 6h7m-7 4h5"
          />
        </svg>
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 1.75a3.25 3.25 0 00-3.25 3.25v6.5a3.25 3.25 0 006.5 0V5A3.25 3.25 0 0012 1.75z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.25 10.5v1a6.25 6.25 0 11-12.5 0v-1M12 18.75V22M8.75 22h6.5"
          />
        </svg>
      )}
    </div>
  );
}

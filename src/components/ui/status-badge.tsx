const variants = {
  ready: "text-green bg-green-lt border-[#A7F3D0]",
  processing: "text-amber bg-amber-lt border-[#FDE68A]",
  connected: "text-green bg-green-lt border-[#A7F3D0]",
  active: "text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]",
  failed: "text-red bg-red-lt border-[#FECACA]",
  pending: "text-muted bg-bg border-border",
  expired: "text-amber bg-amber-lt border-[#FDE68A]",
} as const;

type Variant = keyof typeof variants;

export function StatusBadge({
  variant,
  children,
}: {
  variant: Variant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold ${variants[variant]}`}
    >
      {variant === "processing" && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          style={{ animation: "pulse-dot 1.4s infinite" }}
        />
      )}
      {children}
    </span>
  );
}

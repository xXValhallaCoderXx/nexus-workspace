const iconBg = {
  brand: "bg-brand-lt",
  green: "bg-green-lt",
  amber: "bg-amber-lt",
} as const;

export function KpiCard({
  icon,
  iconColor,
  value,
  label,
  delta,
}: {
  icon: React.ReactNode;
  iconColor: keyof typeof iconBg;
  value: string | number;
  label: string;
  delta?: string;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-[18px] shadow-card transition-shadow hover:shadow-card-md">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-[9px] ${iconBg[iconColor]}`}
        >
          {icon}
        </div>
        {delta && (
          <span className="rounded-full bg-bg px-2 py-[2px] text-[11px] font-bold text-muted">
            {delta}
          </span>
        )}
      </div>
      <div className="text-[26px] font-extrabold tracking-tight text-text">
        {value}
      </div>
      <div className="text-[11px] font-medium text-muted2">{label}</div>
    </div>
  );
}

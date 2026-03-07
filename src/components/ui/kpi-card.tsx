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
    <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-md">
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-[13px] ${iconBg[iconColor]}`}
        >
          {icon}
        </div>
        {delta && (
          <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-semibold text-muted">
            {delta}
          </span>
        )}
      </div>
      <div className="mt-8">
        <div className="text-[30px] font-extrabold tracking-tight text-text">
          {value}
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
          {label}
        </div>
      </div>
    </div>
  );
}

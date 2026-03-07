export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border border-border bg-surface shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div>
        <div className="text-[13px] font-bold text-text">{title}</div>
        {subtitle && (
          <div className="mt-[1px] text-[11px] text-muted2">{subtitle}</div>
        )}
      </div>
      {action}
    </div>
  );
}

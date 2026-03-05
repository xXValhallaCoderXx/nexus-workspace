export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-[3px] text-[13px] text-muted">{subtitle}</p>
      )}
    </div>
  );
}

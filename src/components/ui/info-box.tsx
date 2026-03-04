export function InfoBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-brand-md bg-brand-lt px-5 py-[18px]">
      <div className="mb-2 flex items-center gap-2">
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          stroke="var(--brand)"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-bold text-brand">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-[#4338CA]">{children}</p>
    </div>
  );
}

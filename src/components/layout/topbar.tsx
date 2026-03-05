export function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-border bg-surface px-7 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[15px] font-bold text-text">{title}</span>
        <span className="text-xs text-muted2">{subtitle}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3.5 py-[7px] text-xs font-semibold text-muted transition-all hover:bg-bg hover:text-text">
          <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          Notifications
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white shadow-[0_2px_8px_rgba(91,76,245,0.3)] transition-all hover:bg-[#4A3CE0] hover:shadow-[0_4px_14px_rgba(91,76,245,0.4)]">
          <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
          Upload Transcript
        </button>
      </div>
    </header>
  );
}

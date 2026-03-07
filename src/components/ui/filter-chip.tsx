"use client";

export function FilterChip({
  label,
  active,
  onClick,
  className = "",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-brand bg-brand text-white shadow-[0_6px_18px_rgba(91,76,245,0.22)]"
          : "border-border bg-surface text-muted hover:border-border2 hover:bg-bg hover:text-text"
      } ${className}`}
    >
      {label}
    </button>
  );
}

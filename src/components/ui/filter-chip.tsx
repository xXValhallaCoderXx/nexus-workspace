"use client";

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[7px] border px-[13px] py-[5px] text-xs font-semibold transition-all ${
        active
          ? "border-brand bg-brand text-white shadow-[0_2px_8px_rgba(91,76,245,0.25)]"
          : "border-border bg-surface text-muted hover:border-border2 hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}

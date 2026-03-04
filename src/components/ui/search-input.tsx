"use client";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-[200px] rounded-lg border border-border bg-surface px-3 py-1.5 font-sans text-xs text-text outline-none transition-colors focus:border-brand-md"
    />
  );
}

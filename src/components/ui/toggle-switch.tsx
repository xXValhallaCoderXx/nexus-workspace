"use client";

export function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-[22px] w-10 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 disabled:opacity-50 ${
        enabled ? "bg-brand" : "bg-border2"
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

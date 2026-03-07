import { getMentionSourceMeta } from "@/lib/utils/mention-display";

export function MentionSourceAvatar({
  source,
  size = "sm",
}: {
  source: string;
  size?: "sm" | "lg";
}) {
  const meta = getMentionSourceMeta(source);
  const sizeClassName =
    size === "lg"
      ? "h-12 w-12 rounded-[16px] text-base"
      : "h-11 w-11 rounded-[14px] text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-bold shadow-card ${sizeClassName} ${meta.avatarClassName}`}
      aria-hidden="true"
    >
      {meta.shortLabel}
    </div>
  );
}

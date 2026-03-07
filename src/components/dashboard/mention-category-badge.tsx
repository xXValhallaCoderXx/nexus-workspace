import {
  getMentionCategoryMeta,
  type MentionCategory,
} from "@/lib/utils/mention-display";

export function MentionCategoryBadge({
  category,
  className = "",
}: {
  category: MentionCategory;
  className?: string;
}) {
  const meta = getMentionCategoryMeta(category);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.chipClassName} ${className}`}
    >
      {meta.label}
    </span>
  );
}

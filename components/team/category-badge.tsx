import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_SURFACE_COLORS,
  type CategoryCode,
} from "@/lib/domain/categories";

export function CategoryBadge({
  category,
  label,
  color,
}: {
  category?: CategoryCode | null;
  label?: string;
  color?: string;
}) {
  if (!category && !label) return null;
  const accent = color ?? (category ? CATEGORY_COLORS[category] : "#0A2E5C");
  return (
    <span
      className="border-pool-deep/65 text-pool-deep inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-bold"
      style={{ backgroundColor: category ? CATEGORY_SURFACE_COLORS[category] : "#EFF6FF" }}
    >
      <span
        aria-hidden="true"
        className="h-3 w-1.5 shrink-0 rounded-sm"
        style={{ backgroundColor: accent }}
      />
      {label ?? (category ? CATEGORY_LABELS[category] : "Sin categoría")}
    </span>
  );
}

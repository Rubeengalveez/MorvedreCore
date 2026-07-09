import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { cn } from "@/lib/utils/cn";

export interface CategoryBadgeProps {
  code: string;
  className?: string;
  tone?: "solid" | "soft";
}

export function CategoryBadge({ code, className, tone = "soft" }: CategoryBadgeProps) {
  const label = CATEGORY_LABELS[code as CategoryCode] ?? code;
  const colorHex = categoryAccent(code);
  const isSolid = tone === "solid";
  const textColor = isSolid ? "text-brand-deep" : "text-brand-deep";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-semibold",
        textColor,
        isSolid ? "" : "border",
        className,
      )}
      style={
        isSolid
          ? { backgroundColor: colorHex, color: "#0A2E5C" }
          : { backgroundColor: "transparent", borderColor: colorHex, color: colorHex }
      }
    >
      <span
        aria-hidden="true"
        className="block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: colorHex }}
      />
      {label}
    </span>
  );
}

function categoryAccent(code: string): string {
  switch (code) {
    case "benjamin":
      return "#10B981";
    case "alevin":
      return "#F4C430";
    case "infantil":
      return "#FF6B35";
    case "cadete":
      return "#1E5AA8";
    case "juvenil":
      return "#DC2626";
    case "absoluto":
      return "#0F172A";
    case "escuela":
      return "#475569";
    default:
      return "#475569";
  }
}

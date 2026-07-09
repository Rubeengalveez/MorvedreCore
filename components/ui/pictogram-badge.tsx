import { cn } from "@/lib/utils/cn";

export type PictogramBadgeSize = "xs" | "sm" | "md" | "lg";

export interface PictogramBadgeProps {
  pictogram: React.ComponentType<{ className?: string; accent?: string }>;
  color: string;
  size?: PictogramBadgeSize;
  className?: string;
  ariaLabel?: string;
}

const sizeMap: Record<PictogramBadgeSize, { wrap: string; icon: string }> = {
  xs: { wrap: "h-6 w-6", icon: "h-3 w-3" },
  sm: { wrap: "h-8 w-8", icon: "h-4 w-4" },
  md: { wrap: "h-10 w-10", icon: "h-5 w-5" },
  lg: { wrap: "h-12 w-12", icon: "h-6 w-6" },
};

export function PictogramBadge({
  pictogram: Pictogram,
  color,
  size = "md",
  className,
  ariaLabel,
}: PictogramBadgeProps) {
  const s = sizeMap[size];
  return (
    <span
      data-pictogram-badge
      aria-label={ariaLabel}
      className={cn(
        "text-paper inline-flex shrink-0 items-center justify-center rounded-full",
        s.wrap,
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <Pictogram className={s.icon} />
    </span>
  );
}

import { Flame } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type StreakBadgeSize = "sm" | "md";

export interface StreakBadgeProps {
  value: number;
  label: string;
  best?: number | null;
  size?: StreakBadgeSize;
  className?: string;
  title?: string;
}

const sizeMap: Record<StreakBadgeSize, { wrap: string; value: string; label: string; icon: string }> = {
  sm: { wrap: "h-7 px-2.5", value: "text-sm", label: "text-[10px]", icon: "h-3.5 w-3.5" },
  md: { wrap: "h-9 px-3", value: "text-base", label: "text-[11px]", icon: "h-4 w-4" },
};

export function StreakBadge({
  value,
  label,
  best,
  size = "sm",
  className,
  title,
}: StreakBadgeProps) {
  if (value <= 0) return null;
  const s = sizeMap[size];
  const safeBest = best != null && best > value ? best : null;
  return (
    <span
      data-streak-badge
      title={title ?? (safeBest != null ? `Mejor: ${safeBest}` : undefined)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-action/30 bg-action/10 font-extrabold uppercase tracking-eyebrow",
        s.wrap,
        className,
      )}
    >
      <Flame
        aria-hidden="true"
        className={cn("shrink-0 fill-action text-action", s.icon)}
      />
      <span className={cn("font-mono text-action leading-none tabular-nums", s.value)}>
        {value}
      </span>
      <span className={cn("text-ink-600 leading-none", s.label)}>{label}</span>
      {safeBest != null ? (
        <span className="text-[9px] font-medium leading-none text-ink-400">/{safeBest}</span>
      ) : null}
    </span>
  );
}

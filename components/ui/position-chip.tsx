import { cn } from "@/lib/utils/cn";

export type PositionChipTone = "default" | "top" | "me";

export interface PositionChipProps {
  position: number;
  tone?: PositionChipTone;
  size?: "sm" | "md";
  className?: string;
}

const sizeMap = {
  sm: { wrap: "h-7 w-7 text-sm", aria: "Posición" },
  md: { wrap: "h-8 w-8 text-base", aria: "Posición" },
} as const;

const toneClass: Record<PositionChipTone, string> = {
  default: "bg-paper-sunk text-pool-deep",
  top: "bg-pool-deep text-paper",
  me: "bg-pool-deep text-paper ring-2 ring-ball-gold ring-offset-1 ring-offset-paper-card",
};

export function PositionChip({
  position,
  tone = "default",
  size = "sm",
  className,
}: PositionChipProps) {
  const s = sizeMap[size];
  return (
    <span
      aria-label={`${s.aria} ${position}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-mono font-extrabold tabular-nums",
        s.wrap,
        toneClass[tone],
        className,
      )}
    >
      {position}
    </span>
  );
}

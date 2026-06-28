import { cn } from "@/lib/utils/cn";

export type MedalRank = 1 | 2 | 3;
export type MedalSize = "sm" | "md";

export interface MedalProps {
  rank: MedalRank;
  size?: MedalSize;
  className?: string;
}

const medalPalette: Record<MedalRank, { face: string; rim: string; ink: string; label: string }> = {
  1: { face: "var(--ball-gold)", rim: "#C9A21E", ink: "var(--pool-deep)", label: "Oro" },
  2: { face: "#CBD5E1", rim: "#94A3B8", ink: "var(--pool-deep)", label: "Plata" },
  3: { face: "#A16207", rim: "#78350F", ink: "#FFFFFF", label: "Bronce" },
};

const sizeMap: Record<MedalSize, { wrap: string; ring: string; num: string; ribbon: string }> = {
  sm: { wrap: "h-7 w-7", ring: "h-7 w-7", num: "text-xs", ribbon: "h-1.5" },
  md: { wrap: "h-9 w-9", ring: "h-9 w-9", num: "text-sm", ribbon: "h-2" },
};

export function Medal({ rank, size = "md", className }: MedalProps) {
  const palette = medalPalette[rank];
  const sz = sizeMap[size];
  return (
    <span
      role="img"
      aria-label={`${palette.label}, posición ${rank}`}
      data-medal
      data-medal-rank={rank}
      className={cn("relative inline-flex shrink-0 flex-col items-center", sz.wrap, className)}
    >
      <span
        aria-hidden="true"
        className={cn("w-3 self-center rounded-sm", sz.ribbon)}
        style={{ backgroundColor: palette.face }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex items-center justify-center rounded-full border-2 font-display font-extrabold",
          sz.ring,
          sz.num,
        )}
        style={{
          backgroundColor: palette.face,
          borderColor: palette.rim,
          color: palette.ink,
        }}
      >
        {rank}
      </span>
    </span>
  );
}

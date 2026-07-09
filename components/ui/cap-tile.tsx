import { cn } from "@/lib/utils/cn";

export type CapTileSize = "sm" | "md" | "lg";

export interface CapTileProps {
  number: number;
  teamColor: string;
  size?: CapTileSize;
  isMe?: boolean;
  className?: string;
  "aria-label"?: string;
}

const sizeMap: Record<
  CapTileSize,
  { w: number; h: number; font: number; stripe: number; radius: string }
> = {
  sm: { w: 32, h: 32, font: 16, stripe: 3, radius: "var(--r-xs)" },
  md: { w: 48, h: 48, font: 24, stripe: 4, radius: "var(--r-sm)" },
  lg: { w: 64, h: 64, font: 36, stripe: 5, radius: "var(--r-sm)" },
};

export function CapTile({
  number,
  teamColor,
  size = "md",
  isMe = false,
  className,
  "aria-label": ariaLabel,
}: CapTileProps) {
  const s = sizeMap[size];
  const safeNumber = Math.max(0, Math.min(99, Math.floor(number)));
  const display = safeNumber < 10 ? String(safeNumber) : String(safeNumber);
  return (
    <span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel ?? `Dorsal ${safeNumber}`}
      data-team-cap
      data-cap-size={size}
      className={cn(
        "text-paper shadow-elev-2 relative inline-flex shrink-0 items-center justify-center overflow-hidden font-mono",
        isMe && "cap-tile-ring",
        className,
      )}
      style={
        {
          width: `${s.w}px`,
          height: `${s.h}px`,
          backgroundColor: teamColor,
          borderRadius: s.radius,
          fontSize: `${s.font}px`,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "var(--tracking-tight)",
          fontVariantNumeric: "tabular-nums",
          "--cap-ring": teamColor,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{ height: `${s.stripe}px`, backgroundColor: "rgba(255,255,255,0.18)" }}
      />
      <span className="relative z-[1]">{display}</span>
    </span>
  );
}

import { cn } from "@/lib/utils/cn";

export type WaterDividerVariant = "default" | "footer";

export interface WaterDividerProps {
  fill?: string;
  className?: string;
  variant?: WaterDividerVariant;
  height?: number;
}

export function WaterDivider({
  fill = "var(--brand-foam)",
  className,
  variant = "default",
  height = 48,
}: WaterDividerProps) {
  const isFooter = variant === "footer";

  return (
    <div
      aria-hidden="true"
      className={cn("relative w-full", className)}
      style={{ height: `${height}px` }}
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="absolute inset-0 block h-full w-full"
        fill={fill}
      >
        {isFooter ? (
          <path d="M0,0 L1440,0 L1440,40 C1260,10 1080,5 900,30 C720,55 540,55 360,30 C180,5 0,10 0,40 Z" />
        ) : (
          <path d="M0,0 L1440,0 L1440,40 C1260,70 1080,75 900,50 C720,25 540,25 360,50 C180,75 0,70 0,40 Z" />
        )}
      </svg>
    </div>
  );
}

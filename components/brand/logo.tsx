import { cn } from "@/lib/utils/cn";

export type LogoSize = number | "sm" | "md" | "lg" | "xl";

export interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  withWordmark?: boolean;
  className?: string;
}

const sizeMap: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

function resolveSize(size: LogoSize): number {
  if (typeof size === "number") return size;
  return sizeMap[size];
}

export function Logo({
  size = "md",
  withText = false,
  withWordmark = false,
  className,
}: LogoProps) {
  const px = resolveSize(size);
  const showText = withText || withWordmark;
  const letterSize = Math.max(10, Math.round(px * 0.5));
  const gap = Math.max(8, Math.round(px * 0.25));
  const textSize = Math.max(14, Math.round(px * 0.3));

  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: `${gap}px` }}
    >
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-blue text-paper"
        style={{ width: `${px}px`, height: `${px}px` }}
      >
        <span
          className="font-display font-extrabold leading-none"
          style={{ fontSize: `${letterSize}px` }}
        >
          M
        </span>
      </span>
      {showText ? (
        <span
          className="font-display font-extrabold uppercase tracking-wider text-brand-deep"
          style={{ fontSize: `${textSize}px` }}
        >
          Morvedre
        </span>
      ) : null}
    </span>
  );
}

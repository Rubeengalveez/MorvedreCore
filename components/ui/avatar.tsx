import Image from "next/image";

import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  teamColor?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ src, name, size = 40, className, style, teamColor }: AvatarProps) {
  const initials = getInitials(name) || "?";
  const fontSize = Math.max(11, Math.round(size * 0.4));
  const baseStyle = { width: `${size}px`, height: `${size}px` };
  const bg = teamColor ?? "var(--pool-blue)";

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn(
          "border-ink-300 inline-block shrink-0 rounded-full border object-cover",
          className,
        )}
        style={{ ...baseStyle, ...style }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-display text-paper inline-flex shrink-0 items-center justify-center rounded-full leading-none font-extrabold",
        className,
      )}
      style={{
        ...baseStyle,
        fontSize: `${fontSize}px`,
        backgroundColor: bg,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

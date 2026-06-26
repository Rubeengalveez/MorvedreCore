import Image from "next/image";

import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ src, name, size = 40, className, style }: AvatarProps) {
  const initials = getInitials(name) || "?";
  const fontSize = Math.max(11, Math.round(size * 0.4));

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn(
          "inline-block shrink-0 rounded-full border border-ink-300 object-cover",
          className,
        )}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-blue font-display font-extrabold leading-none text-paper",
        className,
      )}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${fontSize}px` }}
    >
      {initials}
    </span>
  );
}

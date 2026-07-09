import { MdSports } from "react-icons/md";
import type { PictogramProps } from "./types";
import { cn } from "@/lib/utils/cn";

export function SilbatoActivo({ accent, style, className, ...props }: PictogramProps) {
  return (
    <MdSports
      style={{ color: accent, ...style }}
      className={cn("animate-pulse", className)}
      {...props}
    />
  );
}

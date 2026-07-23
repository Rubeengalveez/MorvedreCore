import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EyebrowProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  children?: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4";
  tone?: "default" | "muted" | "inverse";
}

export function Eyebrow({
  children,
  className,
  as = "span",
  tone = "default",
  ...rest
}: EyebrowProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      data-eyebrow
      className={cn(
        "text-eyebrow",
        tone === "default" && "text-ink-600",
        tone === "muted" && "text-ink-500",
        tone === "inverse" && "text-paper",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

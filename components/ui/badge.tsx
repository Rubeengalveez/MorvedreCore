import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-bold tracking-tight transition-colors select-none",
  {
    variants: {
      variant: {
        success: "border-success/25 bg-success/10 text-emerald-800",
        warning: "border-warning/30 bg-amber-50 text-amber-800",
        danger: "border-goggle-red/25 bg-goggle-red/10 text-goggle-red",
        info: "border-pool-blue/20 bg-pool-foam/80 text-pool-deep",
        neutral: "border-ink-200 bg-ink-100/70 text-ink-700",
        brand: "border-pool-deep bg-pool-deep text-paper shadow-sm",
        gold: "border-ball-gold/40 bg-ball-gold/20 text-pool-deep",
      },
      size: {
        sm: "px-2 py-0.5 text-[0.75rem] leading-none",
        md: "px-2.5 py-1 text-xs leading-none",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "sm",
    },
  },
);

const dotColors: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-goggle-red",
  info: "bg-pool-blue",
  neutral: "bg-ink-400",
  brand: "bg-ball-gold",
  gold: "bg-ball-gold",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  icon?: React.ReactNode;
}

export function StatusBadge({
  className,
  variant = "neutral",
  size = "sm",
  dot = false,
  icon,
  children,
  ...props
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? "neutral";
  return (
    <span className={cn(badgeVariants({ variant: resolvedVariant, size }), className)} {...props}>
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColors[resolvedVariant])}
          aria-hidden="true"
        />
      ) : null}
      {icon ? <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export { badgeVariants };

"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-sm)] font-display font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] motion-reduce:transition-none",
  {
    variants: {
      variant: {
        primary: "bg-pool-blue text-paper shadow-elev-2 hover:bg-pool-deep active:bg-pool-deep",
        deep: "bg-pool-deep text-paper hover:bg-ink-900 active:bg-ink-900",
        secondary:
          "border border-ink-300 bg-paper-card text-pool-deep shadow-elev-1 hover:bg-pool-foam active:bg-pool-foam",
        ghost: "text-pool-deep hover:bg-pool-foam active:bg-pool-foam",
        danger: "bg-goggle-red text-paper hover:opacity-90 active:opacity-90",
        success: "bg-success text-paper hover:opacity-90 active:opacity-90",
        gold: "bg-ball-gold text-pool-deep hover:opacity-90 active:opacity-90",
      },
      size: {
        sm: "h-11 min-h-11 px-4 text-sm",
        md: "h-12 min-h-12 px-5 text-base",
        lg: "h-14 min-h-14 px-6 text-base",
        xl: "h-16 min-h-16 px-7 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

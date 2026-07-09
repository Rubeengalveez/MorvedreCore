import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const cardVariants = cva("rounded-md border bg-paper-card text-ink-900", {
  variants: {
    variant: {
      default: "border-ink-300 shadow-elev-1",
      sunk: "border-ink-300 bg-paper-sunk/80 shadow-elev-1",
      stripe: "border-ink-300 relative overflow-hidden",
      lane: "border-ink-300 relative overflow-hidden",
      elev: "border-ink-300 shadow-elev-2 hover:shadow-elev-3 transition-shadow",
      hero: "border-ink-300 shadow-elev-3",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-4 sm:p-5",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      data-card
      data-card-variant={variant ?? "default"}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardStripe = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { color: string }
>(({ className, color, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn("pointer-events-none absolute inset-0", className)}
    style={{
      background: `linear-gradient(135deg, ${color}26 0%, transparent 55%)`,
    }}
    {...props}
  />
));
CardStripe.displayName = "CardStripe";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-display text-pool-deep text-lg leading-tight font-bold", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-ink-600 text-sm", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardStripe,
  cardVariants,
};

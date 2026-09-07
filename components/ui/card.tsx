import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const cardVariants = cva(
  "relative flex flex-col overflow-hidden rounded-2xl border border-ink-200/90 bg-paper-card text-ink-900 transition-[background-color,border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "shadow-elev-1",
        interactive:
          "shadow-elev-1 hover:border-pool-blue/35 hover:bg-pool-foam/20 hover:shadow-elev-2 active:scale-[0.995] touch-manipulation cursor-pointer focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:outline-none",
        lane: "shadow-elev-1",
        sunken: "border-ink-200/60 bg-paper-sunk/75 shadow-none",
        accented: "shadow-elev-1 pl-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  asChild?: boolean;
  accentColor?: string | null;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, asChild = false, accentColor, children, style, ...props }, ref) => {
    const isAccented = variant === "accented" || Boolean(accentColor);
    const isLane = variant === "lane";
    const accentStyle = isAccented
      ? ({
          ...style,
          "--card-accent-color": accentColor ?? "var(--pool-blue)",
        } as React.CSSProperties)
      : style;
    const resolvedClassName = cn(
      cardVariants({ variant: isAccented && !variant ? "accented" : variant, className }),
      isAccented &&
        "pl-5 before:absolute before:inset-y-2 before:left-0 before:z-[1] before:w-1.5 before:rounded-r-full before:bg-[var(--card-accent-color)]",
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={resolvedClassName} style={accentStyle} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <div ref={ref} className={resolvedClassName} style={accentStyle} {...props}>
        {isLane ? <span className="lane-pattern opacity-30" aria-hidden="true" /> : null}
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4 sm:p-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-pool-deep text-lg leading-tight font-extrabold tracking-tight text-balance",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-ink-600 text-sm leading-relaxed text-pretty", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 p-4 pt-0 sm:p-5 sm:pt-0", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export interface CardActionRowProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

const CardActionRow = React.forwardRef<HTMLElement, CardActionRowProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref as never}
        className={cn(
          "hover:bg-pool-foam/50 focus-visible:bg-pool-foam/50 focus-visible:ring-pool-blue border-ink-200/80 flex min-h-14 touch-manipulation items-center gap-3 border-b px-4 py-3 text-left transition-colors [-webkit-tap-highlight-color:transparent] last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none",
          className,
        )}
        {...props}
      />
    );
  },
);
CardActionRow.displayName = "CardActionRow";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardActionRow };

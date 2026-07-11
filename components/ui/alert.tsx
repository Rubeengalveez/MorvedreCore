"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const alertVariants = cva("flex w-full items-start gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-pool-teal/30 bg-pool-teal/10 text-pool-deep",
      success: "border-success/30 bg-success/10 text-ink-900",
      warning: "border-warning/30 bg-warning/10 text-ink-900",
      danger: "border-danger/30 bg-danger/10 text-ink-900",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const alertIcon: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, ...props }, ref) => {
    const Icon = alertIcon[variant ?? "info"];
    return (
      <div
        ref={ref}
        role="alert"
        aria-live={variant === "danger" ? "assertive" : "polite"}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          {title ? <p className="text-pool-deep leading-tight font-extrabold">{title}</p> : null}
          <div className="text-ink-700 leading-relaxed text-pretty">{children}</div>
        </div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export { Alert, alertVariants };

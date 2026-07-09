"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const alertVariants = cva("flex w-full items-start gap-3 rounded-md border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-brand-aqua bg-brand-foam text-ink-900",
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
      <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          {title ? <p className="leading-tight font-semibold">{title}</p> : null}
          <div className="text-ink-600 leading-relaxed">{children}</div>
        </div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export { Alert, alertVariants };

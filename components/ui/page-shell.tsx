import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "@/components/ui/eyebrow";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: "sm" | "md" | "lg" | "xl";
  bleed?: boolean;
}

const widthClass = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
};

export function PageShell({
  children,
  className,
  width = "sm",
  bleed = false,
  ...props
}: PageShellProps) {
  return (
    <div className="relative min-h-full w-full overflow-x-hidden">
      <div
        className={cn(
          "relative z-[1] mx-auto flex w-full flex-col gap-4 py-4 sm:py-5",
          !bleed && "page-gutter",
          widthClass[width],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  teamColor?: string | null;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
  teamColor,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn("surface relative overflow-hidden rounded-lg px-4 py-4", className)}
      style={{
        borderTop: `3px solid ${teamColor ?? "var(--pool-blue)"}`,
      }}
      {...props}
    >
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <Eyebrow className="text-ink-600">{eyebrow}</Eyebrow> : null}
          <h1 className="text-fluid-title font-display text-pool-deep mt-1 leading-[1.05] font-extrabold">
            {title}
          </h1>
          {description ? (
            <p className="text-ink-600 mt-1 max-w-prose text-sm leading-relaxed">{description}</p>
          ) : null}
        </div>
        {icon || action ? (
          <div className="flex shrink-0 items-center gap-2">
            {icon}
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHeader({ title, eyebrow, action, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)} {...props}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="text-ink-500">{eyebrow}</Eyebrow> : null}
        <h2 className="text-fluid-section font-display text-pool-deep leading-tight font-extrabold">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

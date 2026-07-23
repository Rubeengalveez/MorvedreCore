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
    <div className="relative min-h-full w-full overflow-x-clip">
      <div
        className={cn(
          "page-enter relative z-[1] mx-auto flex w-full flex-col gap-4 py-4 sm:py-5",
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
  const accentColor = teamColor ?? "var(--pool-blue)";

  return (
    <header
      className={cn(
        "border-ink-200/90 bg-paper-card/95 relative overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_3px_12px_rgba(6,32,72,0.07)] sm:px-3.5 sm:py-3",
        className,
      )}
      data-page-header
      {...props}
    >
      <span className="lane-pattern opacity-30" aria-hidden="true" />
      <span
        className="absolute inset-y-2 left-0 z-[1] w-1 rounded-r-full"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <div className="relative z-[2] flex flex-col gap-2.5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span
              className="bg-pool-deep text-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_-1px_0_rgba(255,255,255,0.18),0_2px_6px_rgba(6,32,72,0.12)] [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]"
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-pool-deep text-xl leading-6 font-extrabold tracking-tight text-balance sm:text-2xl">
                {title}
              </h1>
              {eyebrow ? (
                <span className="border-pool-blue/15 bg-pool-foam/75 text-pool-deep inline-flex min-h-6 max-w-full items-center rounded-full border px-2 text-[0.8125rem] leading-[1.125rem] font-bold">
                  {eyebrow}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="text-ink-600 mt-1 max-w-2xl text-sm leading-[1.35] text-pretty">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="w-full shrink-0 min-[520px]:w-auto">{action}</div> : null}
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

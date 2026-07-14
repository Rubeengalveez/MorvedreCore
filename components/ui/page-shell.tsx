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
        "border-pool-blue/40 bg-pool-foam relative overflow-hidden rounded-lg border px-3.5 py-3.5 shadow-[0_4px_14px_rgba(6,32,72,0.09)] sm:px-4",
        className,
      )}
      data-page-header
      {...props}
    >
      <span className="lane-pattern opacity-80" aria-hidden="true" />
      <span
        className="absolute inset-y-0 left-0 z-[1] w-1"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <div className="relative z-[2] flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon ? (
            <span
              className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-[inset_0_-2px_0_rgba(255,255,255,0.14)] [&>svg]:h-5 [&>svg]:w-5"
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-pool-deep text-2xl leading-none font-extrabold tracking-tight text-balance sm:text-[1.625rem]">
              {title}
            </h1>
            {eyebrow || description ? (
              <p className="text-ink-700 mt-1 max-w-2xl text-sm leading-5 text-pretty">
                {eyebrow ? (
                  <Eyebrow className="text-pool-deep mr-1.5 text-xs">{eyebrow}</Eyebrow>
                ) : null}
                {eyebrow && description ? <span aria-hidden="true">· </span> : null}
                {description ?? null}
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

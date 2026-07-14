import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function AppPageHero({
  eyebrow,
  title,
  description,
  icon,
  action,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-ink-300 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display text-pool-deep mt-1 text-2xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-ink-600 mt-1 max-w-lg text-sm leading-relaxed text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span className="bg-pool-foam text-pool-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            {icon}
          </span>
        ) : null}
      </div>
      {action ? (
        <div className="[&_a]:!border-ink-200 [&_a]:!bg-paper-card [&_a]:!text-pool-deep [&_button]:!border-ink-200 [&_button]:!bg-paper-card [&_button]:!text-pool-deep shrink-0">
          {action}
        </div>
      ) : null}
    </header>
  );
}

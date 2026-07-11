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
        "bg-pool-deep text-paper shadow-elev-3 relative overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7 sm:py-8",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-2/5 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08))]"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-paper/65 text-xs font-extrabold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="text-paper/75 mt-3 max-w-lg text-sm leading-relaxed text-pretty sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:h-14 sm:w-14">
            {icon}
          </span>
        ) : null}
      </div>
      {action ? <div className="relative mt-5">{action}</div> : null}
    </header>
  );
}

import type { ReactNode } from "react";

import { PageShell, type PageShellProps } from "@/components/ui/page-shell";
import { cn } from "@/lib/utils/cn";

export function AdminPageShell({ children, className, width = "md", ...props }: PageShellProps) {
  return (
    <PageShell width={width} className={cn("gap-5 pb-8", className)} {...props}>
      {children}
    </PageShell>
  );
}

export function AdminPageHeader({
  title,
  description,
  icon,
  action,
  eyebrow = "Administración",
  className,
}: {
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-ink-200 bg-paper-card shadow-elev-1 relative overflow-hidden rounded-2xl border px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      <div className="bg-pool-deep absolute inset-y-0 left-0 w-1" aria-hidden="true" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-pool-foam text-pool-blue flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
            {icon}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
              {eyebrow}
            </p>
            <h1 className="font-display text-pool-deep mt-1 text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
              {title}
            </h1>
            <p className="text-ink-600 mt-1 max-w-2xl text-sm leading-relaxed text-pretty sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
    </header>
  );
}

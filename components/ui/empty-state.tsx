import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-ink-200 bg-paper-card flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center",
        className,
      )}
    >
      <span className="bg-pool-foam text-pool-blue flex h-12 w-12 items-center justify-center rounded-xl">
        {icon}
      </span>
      <h2 className="font-display text-pool-deep mt-4 text-xl font-extrabold text-balance">
        {title}
      </h2>
      <p className="text-ink-600 mt-2 max-w-md text-sm leading-relaxed text-pretty sm:text-base">
        {description}
      </p>
      {action ? <div className="mt-5 w-full max-w-xs">{action}</div> : null}
    </section>
  );
}

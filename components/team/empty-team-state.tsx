import type { ReactNode } from "react";

import { Equipo } from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";

export interface EmptyTeamStateProps {
  title: string;
  description: string;
  pictogram?: ReactNode;
  className?: string;
}

export function EmptyTeamState({
  title,
  description,
  pictogram,
  className,
}: EmptyTeamStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border border-dashed border-ink-300 bg-paper px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-foam">
        {pictogram ?? <Equipo className="h-12 w-12" accent="var(--brand-aqua)" />}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold text-brand-deep">
          {title}
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-ink-600">
          {description}
        </p>
      </div>
    </div>
  );
}

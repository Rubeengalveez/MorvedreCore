import type { ReactNode } from "react";

import { Equipo } from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";

export interface EmptyTeamStateProps {
  title: string;
  description: string;
  pictogram?: ReactNode;
  className?: string;
}

export function EmptyTeamState({ title, description, pictogram, className }: EmptyTeamStateProps) {
  return (
    <div
      className={cn(
        "border-ink-300 bg-paper flex flex-col items-center gap-4 rounded-md border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-pool-foam flex h-20 w-20 items-center justify-center rounded-full">
        {pictogram ?? <Equipo className="h-12 w-12" accent="var(--pool-teal)" />}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-pool-deep text-xl font-extrabold">{title}</h2>
        <p className="text-ink-600 max-w-xs text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

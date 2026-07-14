"use client";

import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useTransition } from "react";

import { cn } from "@/lib/utils/cn";
import { type RankingMetric } from "@/lib/domain/rankings";
import { Balon, Calendario, Exclusion, Trofeo } from "@/components/brand/pictograms";

const METRICS: ReadonlyArray<{
  id: RankingMetric;
  label: string;
  Pictogram: ComponentType<{ className?: string; accent?: string }>;
}> = [
  { id: "goals", label: "Goles", Pictogram: Balon },
  { id: "exclusions", label: "Excl.", Pictogram: Exclusion },
  { id: "mvp", label: "MVP", Pictogram: Trofeo },
  { id: "attendance", label: "Asist.", Pictogram: Calendario },
];

export interface MetricTabsProps {
  active: RankingMetric;
  extraParams?: Record<string, string>;
}

export function MetricTabs({ active, extraParams = {} }: MetricTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(metric: RankingMetric) {
    if (metric === active) return;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    if (metric !== "goals") params.set("metric", metric);
    startTransition(() => {
      router.push(`/rankings?${params.toString()}`);
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Metrica de ranking"
      className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
    >
      {METRICS.map((m) => {
        const Icon = m.Pictogram;
        const isActive = active === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => navigate(m.id)}
            data-metric-tab={m.id}
            className={cn(
              "touch-target focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-extrabold transition-[background-color,border-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
              isActive
                ? "border-pool-deep bg-pool-deep text-paper shadow-elev-2"
                : "border-ink-300 bg-paper-card text-ink-700 hover:border-pool-blue hover:text-pool-deep",
              isPending && "opacity-70",
            )}
          >
            <Icon className="h-4 w-4" accent={isActive ? "var(--ball-gold)" : "currentColor"} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

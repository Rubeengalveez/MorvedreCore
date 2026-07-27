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
  { id: "exclusions", label: "Exp.", Pictogram: Exclusion },
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
      aria-label="Métrica de ranking"
      aria-busy={isPending}
      className="flex items-center gap-1.5 pb-1"
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
            disabled={isPending}
            onClick={() => navigate(m.id)}
            data-metric-tab={m.id}
            className={cn(
              "focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex min-h-12 min-w-0 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-2 text-[13px] font-extrabold transition-[background-color,border-color,color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-sm",
              isActive
                ? "border-pool-deep bg-pool-deep text-paper shadow-elev-2"
                : "border-ink-300 bg-paper-card text-ink-700 hover:border-pool-blue hover:text-pool-deep",
              isPending && "opacity-70",
            )}
          >
            <Icon
              className="hidden h-4 w-4 shrink-0 min-[360px]:block"
              accent={isActive ? "var(--ball-gold)" : "currentColor"}
            />
            <span className="whitespace-nowrap">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

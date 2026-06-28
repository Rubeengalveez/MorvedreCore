"use client";

import { cn } from "@/lib/utils/cn";
import { type RankingMetric } from "@/lib/domain/rankings";

const METRICS: ReadonlyArray<{ id: RankingMetric; label: string }> = [
  { id: "goals", label: "Goles" },
  { id: "exclusions", label: "Excl." },
  { id: "mvp", label: "MVP" },
  { id: "attendance", label: "Asist." },
  { id: "streak", label: "Racha" },
];

export interface MetricTabsProps {
  active: RankingMetric;
  onChange: (metric: RankingMetric) => void;
}

export function MetricTabs({ active, onChange }: MetricTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Métrica de ranking"
      className="inline-flex h-12 w-full items-center rounded-md border border-ink-300 bg-paper p-1"
    >
      {METRICS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={active === m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            "inline-flex h-10 min-h-10 flex-1 items-center justify-center rounded text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
            active === m.id
              ? "bg-pool-deep text-paper"
              : "text-ink-600 hover:text-pool-deep",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

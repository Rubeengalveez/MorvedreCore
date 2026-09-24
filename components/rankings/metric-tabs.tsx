"use client";

import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils/cn";
import { type RankingMetric } from "@/lib/domain/rankings";

export type RankingPageMetric = RankingMetric | "swim";

const METRICS: ReadonlyArray<{ id: RankingPageMetric; label: string; accessibleLabel?: string }> = [
  { id: "goals", label: "Goles" },
  { id: "assists", label: "Asistencias" },
  { id: "goal_contributions", label: "Goles + asist.", accessibleLabel: "Goles más asistencias" },
  { id: "exclusions", label: "Expulsiones" },
  { id: "mvp", label: "MVP" },
  { id: "swim", label: "Nado" },
  { id: "attendance", label: "Entrenos", accessibleLabel: "Asistencia a entrenamientos" },
];

export interface MetricTabsProps {
  active: RankingPageMetric;
  extraParams?: Record<string, string>;
  canViewAttendance?: boolean;
}

export function MetricTabs({
  active,
  extraParams = {},
  canViewAttendance = false,
}: MetricTabsProps) {
  function hrefFor(metric: RankingPageMetric): Route {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
    if (metric !== "goals") params.set("metric", metric);
    return `/rankings?${params.toString()}` as Route;
  }

  return (
    <nav aria-label="Elige ranking">
      <div className="grid grid-cols-3 gap-1.5">
        {METRICS.filter((metric) => canViewAttendance || metric.id !== "attendance").map(
          ({ id, label, accessibleLabel }) => {
            const selected = active === id;
            return (
              <Link
                key={id}
                href={hrefFor(id)}
                aria-current={selected ? "page" : undefined}
                aria-label={accessibleLabel ?? label}
                data-metric-tab={id}
                className={cn(
                  "focus-visible:ring-pool-blue relative inline-flex min-h-12 min-w-0 touch-manipulation items-center justify-center rounded-xl border px-1 text-[13px] font-extrabold transition-[background-color,border-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
                  id === "attendance" && "col-span-3",
                  selected
                    ? "border-pool-deep bg-pool-deep text-paper shadow-elev-2"
                    : "border-ink-200 bg-paper-card text-pool-deep hover:border-pool-blue hover:bg-pool-foam",
                )}
              >
                {selected ? (
                  <span aria-hidden="true" className="bg-ball-gold mr-2 h-1.5 w-1.5 rounded-full" />
                ) : null}
                {label}
              </Link>
            );
          },
        )}
      </div>
    </nav>
  );
}

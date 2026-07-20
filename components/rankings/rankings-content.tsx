"use client";

import { cn } from "@/lib/utils/cn";
import { type CategoryCode } from "@/lib/domain/categories";
import {
  type RankingMetric,
  type RankingScope,
  paginateRankingWithPodium,
} from "@/lib/domain/rankings";
import { streakLabel } from "@/lib/domain/streaks";
import Link from "next/link";
import type { Route } from "next";
import { Dumbbell, Goal, ShieldAlert, Star } from "lucide-react";
import type { RankingsPageMeta, RankingResult } from "@/server/queries/rankings";

import { ScopeTabs } from "./scope-tabs";
import { MetricTabs } from "./metric-tabs";
import { Podium } from "./podium";
import { RankingRowItem } from "./ranking-row";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";

const METRICS: ReadonlyArray<{ id: RankingMetric; label: string; suffix: string }> = [
  { id: "goals", label: "Goles", suffix: "" },
  { id: "exclusions", label: "Excl.", suffix: "" },
  { id: "mvp", label: "MVP", suffix: "" },
  { id: "attendance", label: "Asist.", suffix: "%" },
  { id: "streak", label: "Racha", suffix: "" },
];

export interface RankingsContentProps {
  meta: RankingsPageMeta;
  ranking: RankingResult;
  activeScope: RankingScope;
  activeMetric: RankingMetric;
  myPlayerId: string;
  page: number;
  activeStreakType?: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec";
  activeStreakOrder?: "current" | "best";
  isAdmin?: boolean;
}

function buildBaseParams(input: {
  scope: RankingScope;
  metric: RankingMetric;
  streakType?: string;
  streakOrder?: string;
}): string {
  const params = new URLSearchParams();
  if (input.scope.kind === "category") {
    params.set("scope", `category:${input.scope.category_code}`);
  } else if (input.scope.kind === "team") {
    params.set("scope", `team:${input.scope.team_id}`);
  } else {
    params.set("scope", "all");
  }
  if (input.metric !== "goals") params.set("metric", input.metric);
  if (input.metric === "streak") {
    if (input.streakType) params.set("streak_type", input.streakType);
    if (input.streakOrder) params.set("streak_order", input.streakOrder);
  }
  return params.toString();
}

function scopeLabelOf(scope: RankingScope, meta: RankingsPageMeta): string {
  if (scope.kind === "all") return "Club";
  if (scope.kind === "category") {
    const label = meta.categories.find(
      (c) => c.code === (scope.category_code as CategoryCode),
    )?.label;
    return label ?? scope.category_code;
  }
  return meta.teams.find((t) => t.id === scope.team_id)?.label ?? "Equipo";
}

export function RankingsContent({
  meta,
  ranking,
  activeScope,
  activeMetric,
  myPlayerId,
  page,
  activeStreakType = "train_consec",
  activeStreakOrder = "current",
  isAdmin = false,
}: RankingsContentProps) {
  const metricMeta = METRICS.find((m) => m.id === activeMetric) ?? METRICS[0]!;
  const paged = paginateRankingWithPodium({ ranking: ranking.rows, page, page_size: 10 });
  const hasData = ranking.rows.length > 0;

  const baseParams = buildBaseParams({
    scope: activeScope,
    metric: activeMetric,
    streakType: activeMetric === "streak" ? activeStreakType : undefined,
    streakOrder: activeMetric === "streak" ? activeStreakOrder : undefined,
  });
  const baseHref = `/rankings?${baseParams}`;
  const metricExtraParams: Record<string, string> = {
    scope:
      activeScope.kind === "all"
        ? "all"
        : activeScope.kind === "category"
          ? `category:${activeScope.category_code}`
          : `team:${activeScope.team_id}`,
  };
  const scopeExtraParams: Record<string, string> = { ...metricExtraParams };
  if (activeMetric !== "goals") {
    scopeExtraParams.metric = activeMetric;
  }
  if (activeMetric === "streak") {
    metricExtraParams.streak_type = activeStreakType;
    metricExtraParams.streak_order = activeStreakOrder;
    scopeExtraParams.streak_type = activeStreakType;
    scopeExtraParams.streak_order = activeStreakOrder;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <MetricTabs active={activeMetric} extraParams={metricExtraParams} />
        <ScopeTabs meta={meta} active={activeScope} extraParams={scopeExtraParams} />
      </div>

      {activeMetric === "streak" ? (
        <StreakControls
          activeStreakType={activeStreakType}
          activeStreakOrder={activeStreakOrder}
          baseHref={baseHref}
        />
      ) : null}

      {!hasData ? (
        <EmptyState
          metricLabel={metricMeta.label}
          scopeLabel={scopeLabelOf(activeScope, meta)}
          showRegenerateCta={isAdmin}
        />
      ) : (
        <>
          {paged.podium_rows.length > 0 ? (
            <Podium
              items={paged.podium_rows}
              metricLabel={metricMeta.label}
              metricSuffix={metricMeta.suffix}
              metric={activeMetric}
              myPlayerId={myPlayerId}
            />
          ) : null}

          {paged.list_rows.length > 0 ? (
            <section aria-labelledby="rest-heading" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="rest-heading" className="text-pool-deep text-sm font-extrabold">
                  Ranking completo
                </h2>
                {paged.total_pages > 1 ? (
                  <span className="text-ink-500 text-xs font-bold">
                    Pag. {paged.page} / {paged.total_pages}
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col gap-1.5">
                {paged.list_rows.map((row) => (
                  <li key={row.player_id}>
                    <RankingRowItem
                      row={row}
                      metricLabel={metricMeta.label}
                      metricSuffix={metricMeta.suffix}
                      metric={activeMetric}
                      isMe={row.player_id === myPlayerId}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {paged.total_pages > 1 ? (
            <Pagination
              page={paged.page}
              totalPages={paged.total_pages}
              totalPlayers={paged.total_players}
              pageSize={paged.page_size}
              baseHref={baseHref}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function StreakControls({
  activeStreakType,
  activeStreakOrder,
  baseHref,
}: {
  activeStreakType: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec";
  activeStreakOrder: "current" | "best";
  baseHref: string;
}) {
  const descriptions = {
    train_consec: "Entrenamientos consecutivos con asistencia registrada.",
    goals_consec: "Partidos consecutivos marcando al menos un gol.",
    excl_consec: "Partidos consecutivos con al menos una expulsión.",
    mvp_consec: "Partidos consecutivos siendo elegido MVP.",
  } as const;
  const options = [
    {
      id: "train_consec",
      label: "Entrenos",
      short: "Días seguidos asistiendo",
      icon: Dumbbell,
    },
    {
      id: "goals_consec",
      label: "Goles",
      short: "Partidos seguidos marcando",
      icon: Goal,
    },
    {
      id: "excl_consec",
      label: "Exclusiones",
      short: "Tendencia a corregir",
      icon: ShieldAlert,
    },
    {
      id: "mvp_consec",
      label: "MVP",
      short: "Partidos seguidos como MVP",
      icon: Star,
    },
  ] as const;

  function streakHref(key: "streak_type" | "streak_order", value: string): string {
    const [path, query = ""] = baseHref.split("?");
    const params = new URLSearchParams(query);
    params.set(key, value);
    params.delete("page");
    return `${path}?${params.toString()}#streaks`;
  }

  return (
    <section
      id="streaks"
      className="border-ink-300 bg-paper-card shadow-elev-1 flex scroll-mt-[calc(var(--top-bar-height)+1rem)] flex-col gap-3 rounded-2xl border p-3"
      data-streak-controls
      aria-labelledby="streak-controls-title"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-action text-[11px] font-extrabold tracking-[0.12em] uppercase">
            En directo
          </p>
          <h2 id="streak-controls-title" className="text-pool-deep text-lg font-extrabold">
            Elige tu racha
          </h2>
        </div>
        <span className="text-ink-500 text-xs font-semibold">4 tipos</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isActive = activeStreakType === option.id;
          const Icon = option.icon;
          return (
            <Link
              key={option.id}
              href={streakHref("streak_type", option.id) as Route}
              data-streak-type={option.id}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "focus-visible:ring-pool-blue flex min-h-20 touch-manipulation items-center gap-2.5 rounded-xl border p-2.5 transition-[background-color,border-color,color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
                isActive
                  ? "border-pool-deep bg-pool-deep text-paper shadow-elev-2"
                  : "border-ink-200 bg-paper text-pool-deep hover:border-pool-blue/50 hover:bg-pool-foam/40",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isActive ? "bg-white/12" : "bg-pool-foam",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">{option.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-[11px] leading-snug",
                    isActive ? "text-paper/75" : "text-ink-500",
                  )}
                >
                  {option.short}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div>
        <p className="text-ink-500 mb-1.5 text-xs font-bold">Qué quieres comparar</p>
        <div className="bg-paper-sunk grid grid-cols-2 gap-1 rounded-xl p-1">
          <Link
            href={streakHref("streak_order", "current") as Route}
            data-streak-order="current"
            className={cn(
              "focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center justify-center rounded-lg text-sm font-extrabold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
              activeStreakOrder === "current"
                ? "bg-action text-paper shadow-elev-1"
                : "text-pool-deep",
            )}
          >
            Racha actual
          </Link>
          <Link
            href={streakHref("streak_order", "best") as Route}
            data-streak-order="best"
            className={cn(
              "focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center justify-center rounded-lg text-sm font-extrabold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
              activeStreakOrder === "best"
                ? "bg-action text-paper shadow-elev-1"
                : "text-pool-deep",
            )}
          >
            Mejor racha
          </Link>
        </div>
      </div>
      <p className="border-ink-200 bg-paper-sunk text-ink-600 rounded-xl border px-3 py-2.5 text-sm leading-relaxed">
        <span className="text-pool-deep font-extrabold">{streakLabel(activeStreakType)}.</span>{" "}
        {descriptions[activeStreakType]}
      </p>
    </section>
  );
}

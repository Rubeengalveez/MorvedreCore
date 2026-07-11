"use client";

import { cn } from "@/lib/utils/cn";
import { type CategoryCode } from "@/lib/domain/categories";
import { type RankingMetric, type RankingScope, paginateRanking } from "@/lib/domain/rankings";
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
  const top3 = ranking.rows.slice(0, 3);
  const restOfPlayers = ranking.rows.slice(3);
  const paged = paginateRanking({ ranking: restOfPlayers, page, page_size: 10 });
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
          {page === 1 ? (
            <Podium
              items={top3}
              metricLabel={metricMeta.label}
              metricSuffix={metricMeta.suffix}
              myPlayerId={myPlayerId}
            />
          ) : null}

          {paged.rows.length > 0 ? (
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
                {paged.rows.map((row) => (
                  <li key={row.player_id}>
                    <RankingRowItem
                      row={row}
                      metricLabel={metricMeta.label}
                      metricSuffix={metricMeta.suffix}
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
              totalPlayers={restOfPlayers.length}
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
  return (
    <div
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-2 rounded-md border p-2.5"
      data-streak-controls
    >
      <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
        {[
          { id: "train_consec", label: "Entrenos" },
          { id: "goals_consec", label: "Goles" },
          { id: "excl_consec", label: "Exclusiones" },
          { id: "mvp_consec", label: "MVP" },
        ].map((t) => {
          const isActive = activeStreakType === t.id;
          return (
            <a
              key={t.id}
              href={`${baseHref}&streak_type=${t.id}`}
              data-streak-type={t.id}
              className={cn(
                "touch-target inline-flex min-h-12 shrink-0 items-center rounded-xl px-3 text-sm font-extrabold transition-[background-color,color,box-shadow] motion-reduce:transition-none",
                isActive
                  ? "bg-pool-deep text-paper shadow-elev-1"
                  : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam border",
              )}
            >
              {t.label}
            </a>
          );
        })}
      </div>

      <div className="bg-paper-sunk grid grid-cols-2 gap-1 rounded-sm p-1">
        <a
          href={`${baseHref}&streak_order=current`}
          data-streak-order="current"
          className={cn(
            "focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center justify-center rounded-lg text-sm font-extrabold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
            activeStreakOrder === "current"
              ? "bg-action text-paper shadow-elev-1"
              : "text-pool-deep",
          )}
        >
          Actual
        </a>
        <a
          href={`${baseHref}&streak_order=best`}
          data-streak-order="best"
          className={cn(
            "focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center justify-center rounded-lg text-sm font-extrabold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
            activeStreakOrder === "best" ? "bg-action text-paper shadow-elev-1" : "text-pool-deep",
          )}
        >
          Mejor
        </a>
      </div>
    </div>
  );
}

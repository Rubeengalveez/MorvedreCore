"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { type CategoryCode } from "@/lib/domain/categories";
import {
  type RankingMetric,
  type RankingScope,
  isMyPositionOutsideTopN,
  paginateRanking,
  RANKINGS_PAGE_SIZE,
} from "@/lib/domain/rankings";
import type {
  OpponentHistoryRow,
  RankingsPageMeta,
  RankingResult,
} from "@/server/queries/rankings";

import { ScopeTabs } from "./scope-tabs";
import { MetricTabs } from "./metric-tabs";
import { TopThreeCards } from "./top-three-cards";
import { RankingRow } from "./ranking-row";
import { MyPositionSticky } from "./my-position-sticky";
import { Pagination } from "./pagination";
import { OpponentsMini } from "./opponents-mini";
import { EmptyState } from "./empty-state";

const METRICS: ReadonlyArray<{ id: RankingMetric; label: string; suffix: string }> = [
  { id: "goals", label: "Goles", suffix: "" },
  { id: "exclusions", label: "Exclusiones", suffix: "" },
  { id: "mvp", label: "MVP", suffix: "" },
  { id: "attendance", label: "Asistencia", suffix: "%" },
  { id: "streak", label: "Racha", suffix: "" },
];

export interface RankingsContentProps {
  meta: RankingsPageMeta;
  ranking: RankingResult;
  opponents: OpponentHistoryRow[];
  activeScope: RankingScope;
  activeMetric: RankingMetric;
  myPlayerId: string;
  page: number;
  pageSize: number;
  baseParams: string;
  activeStreakType?: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec";
  activeStreakOrder?: "current" | "best";
}

function scopeToParam(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

export function RankingsContent({
  meta,
  ranking,
  opponents,
  activeScope,
  activeMetric,
  myPlayerId,
  page,
  pageSize,
  baseParams,
  activeStreakType = "train_consec",
  activeStreakOrder = "current",
}: RankingsContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const metricMeta = METRICS.find((m) => m.id === activeMetric) ?? METRICS[0]!;
  const top3 = ranking.rows.slice(0, 3);
  const hasData = ranking.rows.length > 0;

  // Paginamos el resto de los jugadores del 4º puesto en adelante (slice 3+) de 10 en 10
  const restOfPlayers = ranking.rows.slice(3);
  const paged = paginateRanking({ ranking: restOfPlayers, page, page_size: 10 });

  const myOutsideTop10 =
    hasData && isMyPositionOutsideTopN(ranking.rows, myPlayerId, 10);
  const showMyPositionCard = ranking.my_position && !myOutsideTop10;

  function navigate(next: {
    scope?: RankingScope;
    metric?: RankingMetric;
    page?: number;
    streak_type?: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec";
    streak_order?: "current" | "best";
  }) {
    const params = new URLSearchParams(baseParams);
    const scope = next.scope ?? activeScope;
    const metric = next.metric ?? activeMetric;
    const sType = next.streak_type ?? activeStreakType;
    const sOrder = next.streak_order ?? activeStreakOrder;

    if (next.scope) params.set("scope", scopeToParam(scope));
    if (next.metric) params.set("metric", metric);
    if (metric === "goals") params.delete("metric");

    if (metric === "streak") {
      params.set("streak_type", sType);
      params.set("streak_order", sOrder);
    } else {
      params.delete("streak_type");
      params.delete("streak_order");
    }

    if (next.page != null && next.page > 1) {
      params.set("page", String(next.page));
    } else {
      params.delete("page");
    }

    startTransition(() => {
      router.push(`/rankings?${params.toString()}`);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        isPending && "opacity-70 transition-opacity",
      )}
      aria-busy={isPending}
    >
      <MetricTabs active={activeMetric} onChange={(m) => navigate({ metric: m })} />

      <ScopeTabs
        meta={meta}
        active={activeScope}
        onChange={(s) => navigate({ scope: s })}
      />

      {/* Controles del Ranking de Rachas */}
      {activeMetric === "streak" ? (
        <div className="flex flex-col gap-3 rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              Tipo de Racha
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "train_consec", label: "Entrenos" },
                { id: "goals_consec", label: "Goles" },
                { id: "excl_consec", label: "Exclusiones" },
                { id: "mvp_consec", label: "MVP" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate({ streak_type: t.id as any })}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
                    activeStreakType === t.id
                      ? "bg-pool-deep text-paper shadow-sm"
                      : "border border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-ink-300/40 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              Ordenar por
            </span>
            <div className="inline-flex rounded-md border border-ink-300 bg-paper p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => navigate({ streak_order: "current" })}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-extrabold transition-all",
                  activeStreakOrder === "current"
                    ? "bg-brand-orange text-paper"
                    : "text-pool-deep hover:text-brand-orange",
                )}
              >
                Racha Actual
              </button>
              <button
                type="button"
                onClick={() => navigate({ streak_order: "best" })}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-extrabold transition-all",
                  activeStreakOrder === "best"
                    ? "bg-brand-orange text-paper"
                    : "text-pool-deep hover:text-brand-orange",
                )}
              >
                Mejor Racha
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {myOutsideTop10 && ranking.my_position ? (
        <MyPositionSticky
          position={ranking.my_position}
          metricLabel={metricMeta.label}
          metricSuffix={metricMeta.suffix}
          totalPlayers={ranking.total_players}
          href={`/rankings?${buildPageHref(baseParams, paged.total_pages, ranking.rows, myPlayerId, 10)}`}
        />
      ) : null}

      {!hasData ? (
        <EmptyState
          metricLabel={metricMeta.label}
          scopeLabel={scopeLabelOf(activeScope, meta)}
        />
      ) : (
        <>
          {showMyPositionCard && ranking.my_position ? (
            <div className="rounded-md border border-pool-deep/30 bg-pool-foam/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                Tu posición
              </p>
              <p className="mt-1 text-sm font-semibold text-pool-deep">
                {ranking.my_position.row.position}º de {ranking.total_players} en {metricMeta.label.toLowerCase()}{" "}
                {ranking.my_position.delta_to_next != null
                  ? `· a ${ranking.my_position.delta_to_next} del 1º`
                  : "· líder"}
              </p>
            </div>
          ) : null}

          {/* El podio (Top 3) se muestra únicamente en la página 1 */}
          {page === 1 ? (
            <TopThreeCards
              items={top3}
              metricLabel={metricMeta.label}
              metricSuffix={metricMeta.suffix}
              myPlayerId={myPlayerId}
            />
          ) : null}

          {paged.rows.length > 0 ? (
            <section
              aria-labelledby="rest-heading"
              className="flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  id="rest-heading"
                  className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
                >
                  Ranking completo
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Pág. {paged.page} / {paged.total_pages}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {paged.rows.map((row) => (
                  <li key={row.player_id}>
                    <RankingRow
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
              baseHref={`/rankings?${baseParams}`}
            />
          ) : null}
        </>
      )}

      {opponents.length > 0 ? <OpponentsMini opponents={opponents} /> : null}
    </div>
  );
}

function buildPageHref(
  baseParams: string,
  totalPages: number,
  rows: RankingResult["rows"],
  playerId: string,
  pageSize: number,
): string {
  const idx = rows.findIndex((r) => r.player_id === playerId);
  if (idx === -1) return baseParams;
  const targetPage = Math.floor(idx / pageSize) + 1;
  const params = new URLSearchParams(baseParams);
  if (targetPage > 1) params.set("page", String(targetPage));
  else params.delete("page");
  return params.toString();
}

function scopeLabelOf(scope: RankingScope, meta: RankingsPageMeta): string {
  if (scope.kind === "all") return "Club";
  if (scope.kind === "category") {
    const label = meta.categories.find((c) => c.code === (scope.category_code as CategoryCode))?.label;
    return label ?? scope.category_code;
  }
  return meta.teams.find((t) => t.id === scope.team_id)?.label ?? "Equipo";
}

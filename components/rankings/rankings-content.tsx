"use client";

import { type CategoryCode } from "@/lib/domain/categories";
import {
  type RankingMetric,
  type RankingScope,
  isSchoolScope,
  paginateRankingWithPodium,
} from "@/lib/domain/rankings";
import type { RankingsPageMeta, RankingResult } from "@/server/queries/rankings";

import { ScopeTabs } from "./scope-tabs";
import { MetricTabs } from "./metric-tabs";
import { Podium } from "./podium";
import { RankingRowItem } from "./ranking-row";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { RankingPositionJump } from "./ranking-position-jump";
import { useRankingAnchor } from "./use-ranking-anchor";

const METRICS: ReadonlyArray<{
  id: RankingMetric;
  label: string;
  positionLabel: string;
  suffix: string;
}> = [
  { id: "goals", label: "Goles", positionLabel: "goles", suffix: "" },
  { id: "exclusions", label: "Exp.", positionLabel: "expulsiones", suffix: "" },
  { id: "mvp", label: "MVP", positionLabel: "MVP", suffix: "" },
  { id: "attendance", label: "Asist.", positionLabel: "asistencia", suffix: "%" },
];

export interface RankingsContentProps {
  meta: RankingsPageMeta;
  ranking: RankingResult;
  activeScope: RankingScope;
  activeMetric: RankingMetric;
  myPlayerId: string;
  ownProfileId: string;
  trackedPlayerIds: string[];
  page: number;
}

function buildBaseParams(input: { scope: RankingScope; metric: RankingMetric }): string {
  const params = new URLSearchParams();
  if (input.scope.kind === "category") {
    params.set("scope", `category:${input.scope.category_code}`);
  } else if (input.scope.kind === "team") {
    params.set("scope", `team:${input.scope.team_id}`);
  } else {
    params.set("scope", "all");
  }
  if (input.metric !== "goals") params.set("metric", input.metric);
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
  ownProfileId,
  trackedPlayerIds,
  page,
}: RankingsContentProps) {
  const metricMeta = METRICS.find((m) => m.id === activeMetric) ?? METRICS[0]!;
  const paged = paginateRankingWithPodium({ ranking: ranking.rows, page, page_size: 10 });
  const hasData = ranking.rows.length > 0;
  const isSchool = isSchoolScope(activeScope, meta.teams);
  const jumpTargetPlayerId = useRankingAnchor(paged.page);
  const rankingByPlayer = new Map(ranking.rows.map((row) => [row.player_id, row]));
  const trackedRows = trackedPlayerIds
    .map((playerId) => rankingByPlayer.get(playerId) ?? null)
    .filter((row): row is NonNullable<typeof row> => row != null);

  const baseParams = buildBaseParams({
    scope: activeScope,
    metric: activeMetric,
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <MetricTabs active={activeMetric} extraParams={metricExtraParams} />
        <ScopeTabs meta={meta} active={activeScope} extraParams={scopeExtraParams} />
      </div>

      {hasData ? (
        <RankingPositionJump
          rows={trackedRows}
          ownProfileId={ownProfileId}
          pageSize={paged.page_size}
          baseHref={baseHref}
          metricLabel={metricMeta.positionLabel}
          metricSuffix={metricMeta.suffix}
        />
      ) : null}

      {!hasData ? (
        <EmptyState
          metric={activeMetric}
          metricLabel={metricMeta.label}
          scopeLabel={scopeLabelOf(activeScope, meta)}
          isSchool={isSchool}
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
              jumpTargetPlayerId={jumpTargetPlayerId}
            />
          ) : null}

          {paged.list_rows.length > 0 ? (
            <section aria-labelledby="rest-heading" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="rest-heading" className="text-pool-deep text-sm font-extrabold">
                  Ranking completo
                </h2>
                {paged.total_pages > 1 ? (
                  <span className="text-ink-500 text-sm font-bold">
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
                      isJumpTarget={row.player_id === jumpTargetPlayerId}
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

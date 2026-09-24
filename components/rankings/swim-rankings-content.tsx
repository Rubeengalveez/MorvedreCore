"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Waves } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { SwimDistance, SwimRankingMode, SwimRankingRow } from "@/lib/domain/swim-times";
import type { RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

import { MetricTabs } from "./metric-tabs";
import { Pagination } from "./pagination";
import { ScopeTabs } from "./scope-tabs";
import { SwimPodium } from "./swim-podium";
import { SwimRankingCard } from "./swim-ranking-card";
import { useRankingAnchor } from "./use-ranking-anchor";

export function SwimRankingsContent({
  meta,
  rows,
  scope,
  distance,
  mode,
  page,
  myPlayerId,
  canViewAttendance = false,
}: {
  meta: RankingsPageMeta;
  rows: SwimRankingRow[];
  scope: RankingScope;
  distance: SwimDistance;
  mode: SwimRankingMode;
  page: number;
  myPlayerId?: string;
  canViewAttendance?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const jumpTargetPlayerId = useRankingAnchor(activePage);
  const podiumRows = activePage === 1 ? rows.slice(0, 3) : [];
  const listRows =
    activePage === 1
      ? rows.slice(3, pageSize)
      : rows.slice((activePage - 1) * pageSize, activePage * pageSize);
  const scopeParam =
    scope.kind === "all"
      ? "all"
      : scope.kind === "category"
        ? `category:${scope.category_code}`
        : `team:${scope.team_id}`;
  const params = { metric: "swim", distance: String(distance), mode };
  const baseHref = `/rankings?${new URLSearchParams({ scope: scopeParam, ...params }).toString()}`;

  function navigate(changes: Partial<Record<"distance" | "mode", string>>) {
    const next = new URLSearchParams({ scope: scopeParam, ...params, ...changes });
    startTransition(() => router.push(`/rankings?${next.toString()}`));
  }

  function option(label: string, selected: boolean, onClick: () => void) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={pending}
        onClick={onClick}
        className={cn(
          "focus-visible:ring-pool-blue min-h-12 min-w-0 flex-1 touch-manipulation rounded-lg px-1 text-xs font-extrabold focus-visible:ring-2 focus-visible:outline-none sm:text-sm",
          selected ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <MetricTabs
        active="swim"
        extraParams={{ scope: scopeParam }}
        canViewAttendance={canViewAttendance}
      />
      <ScopeTabs meta={meta} active={scope} extraParams={params} />

      <div
        className="border-ink-200 bg-paper-card grid grid-cols-2 gap-2 rounded-xl border p-1.5"
        aria-label="Filtros de nado"
      >
        <div className="bg-paper-sunk flex rounded-lg p-0.5" role="group" aria-label="Distancia">
          {option("50 m", distance === 50, () => navigate({ distance: "50" }))}
          {option("100 m", distance === 100, () => navigate({ distance: "100" }))}
        </div>
        <div
          className="bg-paper-sunk flex rounded-lg p-0.5"
          role="group"
          aria-label="Tipo de marca"
        >
          {option("Actual", mode === "latest", () => navigate({ mode: "latest" }))}
          {option("Mejor", mode === "best", () => navigate({ mode: "best" }))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border-ink-200 bg-paper-card flex flex-col items-center gap-2 rounded-2xl border border-dashed p-7 text-center">
          <Waves className="text-pool-blue h-7 w-7" aria-hidden="true" />
          <p className="text-pool-deep font-extrabold">Todavía no hay tiempos con estos filtros</p>
          <p className="text-ink-600 text-sm">Prueba otra distancia o modo.</p>
        </div>
      ) : (
        <>
          {podiumRows.length > 0 ? (
            <SwimPodium
              items={podiumRows}
              distance={distance}
              mode={mode}
              myPlayerId={myPlayerId}
              jumpTargetPlayerId={jumpTargetPlayerId}
            />
          ) : null}
          {listRows.length > 0 ? (
            <section aria-labelledby="rest-heading" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="rest-heading" className="text-pool-deep text-sm font-extrabold">
                  Ranking completo
                </h2>
                {totalPages > 1 ? (
                  <span className="text-ink-500 text-sm font-bold">
                    Pág. {activePage} / {totalPages}
                  </span>
                ) : null}
              </div>
              <ol className="flex flex-col gap-2">
                {listRows.map((row) => (
                  <li key={row.player_id}>
                    <SwimRankingCard
                      row={row}
                      distance={distance}
                      mode={mode}
                      myPlayerId={myPlayerId}
                      jumpTargetPlayerId={jumpTargetPlayerId}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={activePage}
          totalPages={totalPages}
          totalPlayers={rows.length}
          pageSize={pageSize}
          baseHref={baseHref}
        />
      ) : null}
    </div>
  );
}

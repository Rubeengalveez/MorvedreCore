"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Waves } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { mixHexWithWhite } from "@/lib/utils/color";
import { PositionChip } from "@/components/ui/position-chip";
import { MetricTabs } from "@/components/rankings/metric-tabs";
import { Pagination } from "@/components/rankings/pagination";
import { ScopeTabs } from "@/components/rankings/scope-tabs";
import { SwimPodium } from "@/components/rankings/swim-podium";
import { useRankingAnchor } from "@/components/rankings/use-ranking-anchor";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_SURFACE_COLORS,
} from "@/lib/domain/categories";
import {
  formatSwimTime,
  type SwimDistance,
  type SwimRankingMode,
  type SwimRankingRow,
} from "@/lib/domain/swim-times";
import type { RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

const ME_TINT = mixHexWithWhite("#F4C430", 0.22);

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

  function navigate(changes: Partial<Record<"distance" | "mode", string>>) {
    const next = new URLSearchParams({ scope: scopeParam, ...params, ...changes });
    startTransition(() => router.push(`/rankings?${next.toString()}`));
  }

  const baseParams = new URLSearchParams({ scope: scopeParam, ...params });
  const baseHref = `/rankings?${baseParams.toString()}`;
  const modeLabel = mode === "latest" ? "Actual" : "Mejor";

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <MetricTabs
        active="swim"
        extraParams={{ scope: scopeParam }}
        canViewAttendance={canViewAttendance}
      />
      <ScopeTabs meta={meta} active={scope} extraParams={params} />

      <div className="border-ink-200 bg-paper-card grid grid-cols-2 gap-1 rounded-xl border p-1">
        {[50, 100].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={distance === value}
            onClick={() => navigate({ distance: String(value) })}
            className={`min-h-12 rounded-lg px-3 text-sm font-extrabold ${distance === value ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam"}`}
          >
            {value} metros
          </button>
        ))}
      </div>

      <div className="border-ink-200 bg-paper-card grid grid-cols-2 gap-1 rounded-xl border p-1">
        <ModeButton active={mode === "latest"} onClick={() => navigate({ mode: "latest" })}>
          Tiempo actual
        </ModeButton>
        <ModeButton active={mode === "best"} onClick={() => navigate({ mode: "best" })}>
          Mejor tiempo
        </ModeButton>
      </div>

      <p className="text-ink-600 text-center text-xs font-semibold px-2">
        {mode === "latest"
          ? "Se ordena la última medición de cada jugador esta temporada."
          : "Se ordena la mejor marca de cada jugador esta temporada."}
      </p>

      {rows.length === 0 ? (
        <div className="border-ink-200 bg-paper-card flex flex-col items-center gap-3 rounded-2xl border border-dashed p-7 text-center">
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
              <ol className="flex flex-col gap-1.5">
                {listRows.map((row) => {
                  const teamColor = row.category_code
                    ? CATEGORY_COLORS[row.category_code]
                    : (row.team_color ?? "#1E5AA8");
                  const isTop10 = row.position <= 10;
                  const isMe = row.player_id === myPlayerId;
                  const isJumpTarget = row.player_id === jumpTargetPlayerId;
                  const backgroundColor = isMe
                    ? ME_TINT
                    : isJumpTarget
                      ? mixHexWithWhite(teamColor, 0.24)
                      : row.category_code
                        ? CATEGORY_SURFACE_COLORS[row.category_code]
                        : mixHexWithWhite(teamColor, 0.18);
                  const tone = isMe ? "me" : isTop10 ? "top" : "default";

                  return (
                    <li key={row.player_id}>
                      <Link
                        id={`ranking-player-${row.player_id}`}
                        href={
                          `/players/${row.player_id}/swim-times?from=rankings&distance=${distance}` as Route
                        }
                        className={cn(
                          "border-ink-300 shadow-elev-1 flex min-h-[66px] scroll-mt-[calc(var(--top-bar-height)+1rem)] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
                          isMe && "border-ball-gold/70 ring-ball-gold/35 ring-2",
                          isJumpTarget && "border-action ring-action ring-2 ring-offset-2",
                        )}
                        style={{
                          backgroundColor,
                          borderLeftWidth: "4px",
                          borderLeftColor: teamColor,
                        }}
                      >
                        <PositionChip position={row.position} tone={tone} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-pool-deep line-clamp-1 text-base leading-tight font-extrabold">
                            {row.full_name}
                            {isMe ? (
                              <span className="text-action ml-1 text-xs font-extrabold uppercase">
                                Tú
                              </span>
                            ) : null}
                          </p>
                          <p className="text-ink-700 mt-1 line-clamp-1 text-sm leading-none font-semibold">
                            {row.category_code ? CATEGORY_LABELS[row.category_code] : "Sin categoría"} ·{" "}
                            {formatDate(row.test_date)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
                            {formatSwimTime(row.time_cs)}
                          </p>
                          <p className="text-ink-700 mt-1 text-xs leading-none font-extrabold tracking-[0.08em] uppercase">
                            {modeLabel}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
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

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-12 rounded-lg px-2 text-sm font-extrabold ${active ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam"}`}
    >
      {children}
    </button>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

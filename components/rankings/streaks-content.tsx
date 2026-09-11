"use client";

import Link from "next/link";
import type { Route } from "next";
import { Dumbbell, Flame, Goal, Star, type LucideIcon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { SectionHeader } from "@/components/ui/page-shell";
import { type RankingScope, isSchoolScope, paginateRankingWithPodium } from "@/lib/domain/rankings";
import { type MotivationalStreakType, type StreakOrder } from "@/lib/domain/streak-presentation";
import { cn } from "@/lib/utils/cn";
import type { RankingsPageMeta, RankingResult } from "@/server/queries/rankings";

import { EmptyState } from "./empty-state";
import { Pagination } from "./pagination";
import { Podium } from "./podium";
import { RankingPositionJump } from "./ranking-position-jump";
import { RankingRowItem } from "./ranking-row";
import { ScopeTabs } from "./scope-tabs";
import { useRankingAnchor } from "./use-ranking-anchor";

export interface PersonalStreak {
  playerId: string;
  name: string;
  photoUrl: string | null;
  teamColor: string | null;
  currentValue: number;
  bestValue: number;
}

const STREAK_OPTIONS: Array<{
  id: MotivationalStreakType;
  label: string;
  shortLabel: string;
  description: string;
  unit: string;
  icon: LucideIcon;
}> = [
  {
    id: "train_consec",
    label: "Entrenamientos",
    shortLabel: "Entrenos",
    description: "Entrenamientos consecutivos a los que has asistido.",
    unit: "entrenos seguidos",
    icon: Dumbbell,
  },
  {
    id: "goals_consec",
    label: "Partidos marcando",
    shortLabel: "Goles",
    description: "Partidos consecutivos en los que has marcado al menos 1 gol.",
    unit: "partidos seguidos",
    icon: Goal,
  },
  {
    id: "mvp_consec",
    label: "Partidos como MVP",
    shortLabel: "MVP",
    description: "Partidos consecutivos en los que has sido elegido MVP.",
    unit: "partidos seguidos",
    icon: Star,
  },
];

function scopeParam(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

function buildHref({
  scope,
  type,
  order,
}: {
  scope: RankingScope;
  type: MotivationalStreakType;
  order: StreakOrder;
}): string {
  const params = new URLSearchParams();
  params.set("scope", scopeParam(scope));
  if (type !== "train_consec") params.set("type", type);
  if (order !== "current") params.set("order", order);
  return `/streaks?${params.toString()}`;
}

function scopeLabel(scope: RankingScope, meta: RankingsPageMeta): string {
  if (scope.kind === "all") return "Club";
  if (scope.kind === "category") {
    return (
      meta.categories.find((category) => category.code === scope.category_code)?.label ??
      "Categoría"
    );
  }
  return meta.teams.find((team) => team.id === scope.team_id)?.label ?? "Equipo";
}

export function StreaksContent({
  meta,
  ranking,
  activeScope,
  activeType,
  activeOrder,
  ownProfileId,
  trackedPlayerIds,
  personalStreaks,
  page,
}: {
  meta: RankingsPageMeta;
  ranking: RankingResult;
  activeScope: RankingScope;
  activeType: MotivationalStreakType;
  activeOrder: StreakOrder;
  ownProfileId: string;
  trackedPlayerIds: string[];
  personalStreaks: PersonalStreak[];
  page: number;
}) {
  const option = STREAK_OPTIONS.find((item) => item.id === activeType) ?? STREAK_OPTIONS[0]!;
  const paged = paginateRankingWithPodium({ ranking: ranking.rows, page, page_size: 10 });
  const jumpTargetPlayerId = useRankingAnchor(paged.page);
  const rankingByPlayer = new Map(ranking.rows.map((row) => [row.player_id, row]));
  const trackedRows = trackedPlayerIds
    .map((playerId) => rankingByPlayer.get(playerId) ?? null)
    .filter((row): row is NonNullable<typeof row> => row != null);
  const isSchool = isSchoolScope(activeScope, meta.teams);
  const baseHref = buildHref({
    scope: activeScope,
    type: activeType,
    order: activeOrder,
  });
  const filterParams: Record<string, string> = {};
  if (activeType !== "train_consec") filterParams.type = activeType;
  if (activeOrder !== "current") filterParams.order = activeOrder;

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="streak-type-title"
        className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="bg-ball-gold/25 text-action flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="streak-type-title" className="text-pool-deep font-extrabold">
              Elige el reto
            </h2>
            <p className="text-ink-600 mt-0.5 text-sm">Cada racha mide algo diferente.</p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Tipo de racha"
          className="border-ink-200 grid grid-cols-3 border-y"
        >
          {STREAK_OPTIONS.map(({ id, shortLabel, icon: Icon }) => {
            const isActive = id === activeType;
            return (
              <Link
                key={id}
                href={
                  buildHref({
                    scope: activeScope,
                    type: id,
                    order: activeOrder,
                  }) as Route
                }
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "border-ink-200 focus-visible:ring-pool-blue flex min-h-16 touch-manipulation flex-col items-center justify-center gap-1 border-r px-1 text-sm font-extrabold transition-[background-color,color,box-shadow] duration-200 last:border-r-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none",
                  isActive
                    ? "bg-pool-deep text-paper shadow-elev-1"
                    : "text-ink-600 hover:bg-pool-foam/60 hover:text-pool-deep",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{shortLabel}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 min-[520px]:flex-row min-[520px]:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-pool-deep text-sm font-extrabold">{option.label}</p>
            <p className="text-ink-600 mt-0.5 text-sm leading-snug text-pretty">
              {option.description}
            </p>
          </div>
          <div className="bg-paper-sunk grid w-full shrink-0 grid-cols-2 gap-1 rounded-lg p-1 min-[520px]:w-auto">
            {(["current", "best"] as const).map((order) => (
              <Link
                key={order}
                href={
                  buildHref({
                    scope: activeScope,
                    type: activeType,
                    order,
                  }) as Route
                }
                aria-current={activeOrder === order ? "true" : undefined}
                className={cn(
                  "focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center rounded-md px-2.5 text-sm font-extrabold transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
                  activeOrder === order
                    ? "bg-paper-card text-pool-deep shadow-sm"
                    : "text-ink-500 hover:text-pool-deep",
                )}
              >
                {order === "current" ? "Ahora" : "Récord"}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {personalStreaks.length > 0 ? (
        <PersonalProgress
          streaks={personalStreaks}
          unit={option.unit}
          ownProfileId={ownProfileId}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <ScopeTabs
          meta={meta}
          active={activeScope}
          extraParams={filterParams}
          basePath="/streaks"
        />
      </div>

      {ranking.rows.length > 0 ? (
        <RankingPositionJump
          rows={trackedRows}
          ownProfileId={ownProfileId}
          pageSize={paged.page_size}
          baseHref={baseHref}
          metricLabel={option.unit}
          metricSuffix=""
        />
      ) : null}

      {ranking.rows.length === 0 ? (
        <EmptyState
          metric={activeType}
          metricLabel="Rachas"
          scopeLabel={scopeLabel(activeScope, meta)}
          isSchool={isSchool}
          description={
            isSchool
              ? activeType === "train_consec"
                ? "Cuando se registre asistencia en los entrenamientos de la Escuela, aparecerán aquí las rachas."
                : "La Escuela es formativa y no disputa partidos de competición ni genera actas."
              : undefined
          }
        />
      ) : (
        <>
          {paged.podium_rows.length > 0 ? (
            <Podium
              items={paged.podium_rows}
              metricLabel="Racha"
              metricSuffix=""
              metric="streak"
              myPlayerId={ownProfileId}
              jumpTargetPlayerId={jumpTargetPlayerId}
            />
          ) : null}

          {paged.list_rows.length > 0 ? (
            <section aria-labelledby="streak-ranking-title" className="flex flex-col gap-2">
              <SectionHeader
                id="streak-ranking-title"
                title="Clasificación completa"
                eyebrow={`${scopeLabel(activeScope, meta)} · ${activeOrder === "current" ? "racha actual" : "récord personal"}`}
              />
              <ul className="flex flex-col gap-1.5">
                {paged.list_rows.map((row) => (
                  <li key={row.player_id}>
                    <RankingRowItem
                      row={row}
                      metricLabel={option.shortLabel}
                      metricSuffix=""
                      metric="streak"
                      isMe={row.player_id === ownProfileId}
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

function PersonalProgress({
  streaks,
  unit,
  ownProfileId,
}: {
  streaks: PersonalStreak[];
  unit: string;
  ownProfileId: string;
}) {
  return (
    <section
      aria-labelledby="personal-streak-title"
      className="border-pool-blue/20 bg-pool-foam/45 overflow-hidden rounded-2xl border"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-pool-blue text-sm font-bold">
            {streaks.length === 1 ? "Tu progreso" : "Progreso de tu familia"}
          </p>
          <h2 id="personal-streak-title" className="text-pool-deep font-extrabold">
            {streaks.length === 1 ? "Tu reto personal" : "Retos de tus hijos"}
          </h2>
        </div>
        <Flame className="text-action h-6 w-6 shrink-0" aria-hidden="true" />
      </div>
      <div className="border-pool-blue/15 divide-pool-blue/15 divide-y border-t">
        {streaks.map((streak) => {
          const progress =
            streak.bestValue > 0 ? Math.min(1, streak.currentValue / streak.bestValue) : 0;
          const difference = Math.max(0, streak.bestValue - streak.currentValue);
          const isOwn = streak.playerId === ownProfileId;
          return (
            <article
              key={streak.playerId}
              className="bg-paper-card/85 flex items-center gap-3 px-4 py-3"
            >
              <Avatar
                name={streak.name}
                src={streak.photoUrl}
                size={44}
                teamColor={streak.teamColor ?? undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-pool-deep truncate text-sm font-extrabold">
                    {isOwn ? "Tú" : streak.name}
                  </h3>
                  <span className="text-pool-deep shrink-0 font-mono text-sm font-extrabold tabular-nums">
                    {streak.currentValue}{" "}
                    <span className="text-ink-500 font-sans">/ {streak.bestValue}</span>
                  </span>
                </div>
                <span
                  className="bg-ink-100 mt-1.5 block h-1.5 overflow-hidden rounded-full"
                  aria-hidden="true"
                >
                  <span
                    className="bg-action block h-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                </span>
                <p className="text-ink-600 mt-1.5 text-sm">
                  {streak.currentValue > 0 && streak.currentValue >= streak.bestValue
                    ? `Estás en tu mejor marca: ${streak.currentValue} ${unit}.`
                    : streak.bestValue === 0
                      ? `Tu próximo reto empieza con 1 ${unit}.`
                      : `${difference} para igualar tu récord de ${streak.bestValue}.`}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

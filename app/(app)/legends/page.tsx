import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  CalendarDays,
  Star,
  Target,
  Trophy,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { RankingsSectionNav } from "@/components/rankings/rankings-section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Medal } from "@/components/ui/medal";
import { PageHeader, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { type LegendMetric, type LegendRow } from "@/lib/domain/history";
import { cn } from "@/lib/utils/cn";
import { getClubHistory } from "@/server/queries/history";
import { getSwimLegends } from "@/server/queries/swim-times";
import { getRankingsMeta } from "@/server/queries/rankings";
import { ScopeTabs } from "@/components/rankings/scope-tabs";
import { formatSwimTime, type SwimRankingRow } from "@/lib/domain/swim-times";
import type { RankingScope } from "@/lib/domain/rankings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Leyendas del club - Morvedre Core",
  description: "Clasificaciones históricas de los jugadores del Waterpolo Morvedre.",
};

const METRICS: Array<{
  value: LegendMetric | "swim50" | "swim100";
  label: string;
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
}> = [
  {
    value: "goals",
    label: "Goles",
    title: "Máximos goleadores",
    eyebrow: "Goles acumulados",
    Icon: Target,
  },
  {
    value: "matches_played",
    label: "Partidos",
    title: "Más partidos disputados",
    eyebrow: "Trayectoria en el club",
    Icon: CalendarDays,
  },
  {
    value: "mvp_count",
    label: "MVP",
    title: "Más veces MVP",
    eyebrow: "Actuaciones destacadas",
    Icon: Star,
  },
  {
    value: "swim50",
    label: "50 m",
    title: "Mejores tiempos de 50 m",
    eyebrow: "Cada intento cuenta",
    Icon: Waves,
  },
  {
    value: "swim100",
    label: "100 m",
    title: "Mejores tiempos de 100 m",
    eyebrow: "Cada intento cuenta",
    Icon: Waves,
  },
];

type LegendPageMetric = LegendMetric | "swim50" | "swim100";

function parseMetric(value?: string): LegendPageMetric {
  return METRICS.some((metric) => metric.value === value) ? (value as LegendPageMetric) : "goals";
}

function metricValue(row: LegendRow, metric: LegendMetric): string {
  return row[metric].toLocaleString("es-ES");
}

function metricContext(row: LegendRow, metric: LegendMetric): string {
  if (metric === "matches_played") return `${row.seasons} temporadas`;
  return `${row.matches_played} partidos · ${row.seasons} temporadas`;
}

function legendRowTone(rank: number): string {
  if (rank === 1) return "border-ball-gold bg-amber-50 shadow-elev-2";
  if (rank === 2) return "border-pool-blue bg-blue-50 shadow-elev-1";
  if (rank === 3) return "border-action bg-orange-50 shadow-elev-1";
  return "border-ink-200 bg-paper-card shadow-sm";
}

function LegendList({ rows, metric }: { rows: LegendRow[]; metric: LegendMetric }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-7 w-7" aria-hidden="true" />}
        title="Todavía no hay un histórico"
        description="Los datos aparecerán aquí cuando haya estadísticas registradas o se cierre la primera temporada."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li
          key={row.profile_id}
          className={cn(
            "flex min-h-[4.5rem] items-center gap-3 rounded-xl border px-3 py-3 transition-transform duration-200 motion-reduce:transition-none sm:px-4",
            legendRowTone(row.rank),
          )}
        >
          <div className="flex w-9 shrink-0 justify-center">
            {row.rank <= 3 ? (
              <Medal rank={row.rank as 1 | 2 | 3} size="sm" />
            ) : (
              <span className="text-ink-500 font-mono text-sm font-bold">{row.rank}</span>
            )}
          </div>
          <Avatar src={row.photo_url} name={row.profile_name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-pool-deep truncate text-sm font-extrabold sm:text-base">
              {row.profile_name}
            </p>
            <p className="text-ink-500 mt-0.5 truncate text-sm">{metricContext(row, metric)}</p>
          </div>
          <p className="text-pool-deep shrink-0 font-mono text-xl font-black tabular-nums sm:text-2xl">
            {metricValue(row, metric)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default async function LegendsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const metric = parseMetric(params.metric);
  const isSwim = metric === "swim50" || metric === "swim100";
  const scope: RankingScope = params.scope?.startsWith("category:")
    ? {
        kind: "category",
        category_code: params.scope.slice(9) as import("@/lib/domain/categories").CategoryCode,
      }
    : { kind: "all" };
  const [history, swimRows, rankingMeta] = await Promise.all([
    isSwim ? Promise.resolve(null) : getClubHistory(metric as LegendMetric),
    isSwim
      ? getSwimLegends({
          distance: metric === "swim100" ? 100 : 50,
          category: scope.kind === "category" ? scope.category_code : null,
        })
      : Promise.resolve(null),
    isSwim ? getRankingsMeta() : Promise.resolve(null),
  ]);
  const activeMetric = METRICS.find((item) => item.value === metric) ?? METRICS[0]!;
  const archivedSeasons =
    history?.archivedSeasons ?? new Set(swimRows?.map((row) => row.season_label)).size;
  const seasonLabel = `${archivedSeasons} ${archivedSeasons === 1 ? "temporada" : "temporadas"}`;

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageHeader
        eyebrow={seasonLabel}
        title="Leyendas del club"
        description="La historia la escriben quienes defienden el gorro del Morvedre."
        icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
        teamColor="var(--ball-gold)"
      />

      <RankingsSectionNav active="legends" />

      <nav aria-label="Clasificación histórica" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {METRICS.map(({ value, label, Icon }) => (
          <Link
            key={value}
            href={`/legends?metric=${value}` as Route}
            aria-current={metric === value ? "page" : undefined}
            className={cn(
              "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-extrabold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
              metric === value
                ? "border-pool-deep bg-pool-deep text-paper shadow-elev-2"
                : "border-ink-200 bg-paper-card text-ink-600 hover:border-pool-blue/40 hover:text-pool-deep",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {isSwim && rankingMeta ? (
        <div className="flex flex-col gap-2">
          <ScopeTabs
            meta={rankingMeta}
            active={scope}
            basePath="/legends"
            extraParams={{ metric }}
          />
          <p className="bg-pool-foam text-pool-deep rounded-xl px-4 py-3 text-sm font-bold">
            Cada intento cuenta. Un jugador puede aparecer varias veces.
          </p>
        </div>
      ) : null}

      <section aria-label={activeMetric.title} className="flex flex-col gap-3">
        <SectionHeader title={activeMetric.title} eyebrow={activeMetric.eyebrow} />
        {isSwim ? (
          <SwimLegendList
            rows={(swimRows ?? []).slice(0, 25)}
            distance={metric === "swim100" ? 100 : 50}
          />
        ) : (
          <LegendList rows={history?.legends ?? []} metric={metric as LegendMetric} />
        )}
      </section>
    </PageShell>
  );
}

function SwimLegendList({ rows, distance }: { rows: SwimRankingRow[]; distance: 50 | 100 }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Waves className="h-7 w-7" aria-hidden="true" />}
        title="Todavía no hay tiempos"
        description="Las marcas aparecerán aquí cuando un entrenador las registre."
      />
    );
  }
  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li
          key={row.id}
          className={cn(
            "flex min-h-[4.5rem] items-center gap-3 rounded-xl border px-3 py-3",
            legendRowTone(row.position),
          )}
        >
          <div className="flex w-9 shrink-0 justify-center">
            {row.position <= 3 ? (
              <Medal rank={row.position as 1 | 2 | 3} size="sm" />
            ) : (
              <span className="text-ink-500 font-mono text-sm font-bold">{row.position}</span>
            )}
          </div>
          <Avatar src={row.photo_url} name={row.full_name} size={44} />
          <div className="min-w-0 flex-1">
            <Link
              href={
                `/players/${row.player_id}/swim-times?from=legends&distance=${distance}` as Route
              }
              className="text-pool-deep focus-visible:ring-pool-blue block truncate text-sm font-extrabold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {row.full_name}
            </Link>
            <p className="text-ink-500 mt-0.5 truncate text-sm">
              {formatLegendDate(row.test_date)} · {row.season_label}
            </p>
          </div>
          <p className="text-pool-deep shrink-0 font-mono text-xl font-black tabular-nums">
            {formatSwimTime(row.time_cs)}
          </p>
        </li>
      ))}
    </ol>
  );
}



function formatLegendDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  CalendarDays,
  Star,
  Target,
  Trophy,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Medal } from "@/components/ui/medal";
import { PageHeader, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { type LegendMetric, type LegendRow } from "@/lib/domain/history";
import { cn } from "@/lib/utils/cn";
import { getClubHistory } from "@/server/queries/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Leyendas del club - Morvedre Core",
  description: "Clasificaciones históricas de los jugadores del Waterpolo Morvedre.",
};

const METRICS: Array<{
  value: LegendMetric;
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
    value: "attendance_pct",
    label: "Asistencia",
    title: "Mayor asistencia",
    eyebrow: "Compromiso en entrenamientos",
    Icon: UserCheck,
  },
];

function parseMetric(value?: string): LegendMetric {
  return METRICS.some((metric) => metric.value === value) ? (value as LegendMetric) : "goals";
}

function metricValue(row: LegendRow, metric: LegendMetric): string {
  if (metric === "attendance_pct") return `${Math.round(row.attendance_pct)}%`;
  return row[metric].toLocaleString("es-ES");
}

function metricContext(row: LegendRow, metric: LegendMetric): string {
  if (metric === "attendance_pct") {
    return `${row.trainings_attended}/${row.trainings_total} entrenos`;
  }
  if (metric === "matches_played") return `${row.seasons} temporadas`;
  return `${row.matches_played} partidos · ${row.seasons} temporadas`;
}

function legendRowTone(rank: number): string {
  if (rank === 1) return "border-ball-gold/60 bg-ball-gold/10 shadow-elev-2";
  if (rank === 2) return "border-pool-blue/30 bg-pool-foam/45 shadow-elev-1";
  if (rank === 3) return "border-action/25 bg-action/5 shadow-elev-1";
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
            <p className="text-ink-500 mt-0.5 truncate text-xs">{metricContext(row, metric)}</p>
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
  searchParams: Promise<{ metric?: string }>;
}) {
  const params = await searchParams;
  const metric = parseMetric(params.metric);
  const history = await getClubHistory(metric);
  const activeMetric = METRICS.find((item) => item.value === metric) ?? METRICS[0]!;
  const seasonLabel = `${history.archivedSeasons} ${history.archivedSeasons === 1 ? "temporada archivada" : "temporadas archivadas"}`;

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <Link
        href="/rankings"
        className="text-pool-blue focus-visible:ring-pool-blue inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Rankings de temporada
      </Link>

      <PageHeader
        eyebrow={seasonLabel}
        title="Leyendas del club"
        description="La historia la escriben quienes defienden el gorro del Morvedre."
        icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
        teamColor="var(--ball-gold)"
      />

      <nav aria-label="Clasificación histórica" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METRICS.map(({ value, label, Icon }) => (
          <Link
            key={value}
            href={`/legends?metric=${value}` as Route}
            aria-current={metric === value ? "page" : undefined}
            className={cn(
              "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-extrabold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
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

      <section aria-label={activeMetric.title} className="flex flex-col gap-3">
        <SectionHeader title={activeMetric.title} eyebrow={activeMetric.eyebrow} />
        <LegendList rows={history.legends} metric={metric} />
      </section>
    </PageShell>
  );
}

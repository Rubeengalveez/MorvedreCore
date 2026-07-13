import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Shield, Swords, Trophy } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { AppPageHero } from "@/components/ui/app-page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { Medal } from "@/components/ui/medal";
import { PageShell, SectionHeader } from "@/components/ui/page-shell";
import {
  bestRivals,
  toughestRivals,
  type LegendMetric,
  type LegendRow,
  type RivalryRow,
} from "@/lib/domain/history";
import { cn } from "@/lib/utils/cn";
import { getClubHistory } from "@/server/queries/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Leyendas del club - Morvedre Core",
  description: "Rankings históricos y rivalidades del Waterpolo Morvedre.",
};

const METRICS: { value: LegendMetric; label: string }[] = [
  { value: "goals", label: "Goles" },
  { value: "matches_played", label: "Partidos" },
  { value: "mvp_count", label: "MVP" },
  { value: "attendance_pct", label: "Asistencia" },
];

function parseMetric(value?: string): LegendMetric {
  return METRICS.some((metric) => metric.value === value) ? (value as LegendMetric) : "goals";
}

function metricValue(row: LegendRow, metric: LegendMetric): string {
  if (metric === "attendance_pct") return `${row.attendance_pct.toLocaleString("es-ES")}%`;
  return row[metric].toLocaleString("es-ES");
}

function metricContext(row: LegendRow, metric: LegendMetric): string {
  if (metric === "attendance_pct") {
    return `${row.trainings_attended}/${row.trainings_total} entrenos`;
  }
  if (metric === "matches_played") return `${row.seasons} temporadas`;
  return `${row.matches_played} partidos · ${row.seasons} temporadas`;
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
    <ol className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.profile_id}
          className="border-ink-200 bg-paper-card shadow-elev-1 flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2.5 sm:px-4"
        >
          <div className="flex w-9 shrink-0 justify-center">
            {row.rank <= 3 ? (
              <Medal rank={row.rank as 1 | 2 | 3} size="sm" />
            ) : (
              <span className="text-ink-500 font-mono text-sm font-bold">{row.rank}</span>
            )}
          </div>
          <Avatar src={row.photo_url} name={row.profile_name} size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-pool-deep truncate text-sm font-extrabold sm:text-base">
              {row.profile_name}
            </p>
            <p className="text-ink-500 truncate text-xs">{metricContext(row, metric)}</p>
          </div>
          <p className="text-pool-deep shrink-0 font-mono text-xl font-black tabular-nums">
            {metricValue(row, metric)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function RivalList({ rows, tone }: { rows: RivalryRow[]; tone: "best" | "tough" }) {
  if (rows.length === 0) {
    return (
      <p className="border-ink-200 bg-paper-card text-ink-600 rounded-lg border p-4 text-sm">
        Necesitamos al menos dos partidos contra un rival para incluirlo.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <li
          key={row.opponent}
          className={cn(
            "bg-paper-card flex items-center gap-3 rounded-lg border px-3 py-3",
            tone === "best" ? "border-success/25" : "border-goggle-red/25",
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-black",
              tone === "best" ? "bg-success/10 text-success" : "bg-goggle-red/10 text-goggle-red",
            )}
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-pool-deep truncate font-extrabold">{row.opponent}</p>
            <p className="text-ink-500 text-xs">
              {row.wins}V · {row.draws}E · {row.losses}D · {row.matches_played} partidos
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-pool-deep font-mono text-base font-black tabular-nums">
              {row.win_pct.toLocaleString("es-ES")}%
            </p>
            <p className="text-ink-500 font-mono text-xs tabular-nums">
              {row.goal_diff > 0 ? "+" : ""}
              {row.goal_diff} goles
            </p>
          </div>
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
  const metric = parseMetric((await searchParams).metric);
  const history = await getClubHistory(metric);
  const best = bestRivals(history.rivalries);
  const toughest = toughestRivals(history.rivalries);

  return (
    <PageShell width="lg" className="gap-6 pb-8">
      <AppPageHero
        eyebrow={`${history.archivedSeasons} temporadas archivadas${history.currentSeasonLabel ? ` · ${history.currentSeasonLabel} en curso` : ""}`}
        title="Leyendas del club"
        description="La huella acumulada de quienes han defendido el gorro del Morvedre."
        icon={<Trophy className="h-7 w-7" aria-hidden="true" />}
        action={
          <Link
            href="/rankings"
            className="focus-visible:ring-ball-gold inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-extrabold text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Rankings de temporada
          </Link>
        }
      />

      <section aria-labelledby="legends-title" className="flex flex-col gap-3">
        <SectionHeader
          title="Top histórico"
          eyebrow="Todas las temporadas"
          action={
            <nav aria-label="Métrica histórica" className="hidden sm:block">
              <div className="border-ink-200 bg-paper-card flex rounded-full border p-1">
                {METRICS.map((item) => (
                  <Link
                    key={item.value}
                    href={`/legends?metric=${item.value}` as Route}
                    aria-current={metric === item.value ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-pool-blue inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none",
                      metric === item.value
                        ? "bg-pool-deep text-paper"
                        : "text-ink-600 hover:text-pool-deep",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          }
        />
        <nav aria-label="Métrica histórica" className="scrollbar-hide overflow-x-auto sm:hidden">
          <div className="border-ink-200 bg-paper-card flex w-max rounded-full border p-1">
            {METRICS.map((item) => (
              <Link
                key={item.value}
                href={`/legends?metric=${item.value}` as Route}
                aria-current={metric === item.value ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold",
                  metric === item.value ? "bg-pool-deep text-paper" : "text-ink-600",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <h2 id="legends-title" className="sr-only">
          Clasificación histórica
        </h2>
        <LegendList rows={history.legends} metric={metric} />
      </section>

      <section aria-labelledby="rivalries-title" className="flex flex-col gap-3">
        <SectionHeader title="Rivalidades" eyebrow="Cara a cara histórico" />
        <h2 id="rivalries-title" className="sr-only">
          Mejores y peores rivales
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Shield className="text-success h-5 w-5" aria-hidden="true" />
              <h3 className="text-pool-deep font-display text-lg font-extrabold">Mejores cruces</h3>
            </div>
            <RivalList rows={best} tone="best" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Swords className="text-goggle-red h-5 w-5" aria-hidden="true" />
              <h3 className="text-pool-deep font-display text-lg font-extrabold">Bestias negras</h3>
            </div>
            <RivalList rows={toughest} tone="tough" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

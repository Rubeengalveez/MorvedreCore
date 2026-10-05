import { ChartNoAxesColumn } from "lucide-react";
import type { playerActaPerformance } from "@/lib/domain/player-acta-performance";

export function PlayerSeasonStats({
  stats,
  exclusions,
  mvpCount,
}: {
  stats: ReturnType<typeof playerActaPerformance>;
  exclusions: number;
  mvpCount: number | null;
}) {
  return (
    <section aria-labelledby="player-season-heading">
      <div className="flex items-center gap-2 px-1">
        <ChartNoAxesColumn className="text-pool-blue h-5 w-5" aria-hidden="true" />
        <h2
          id="player-season-heading"
          className="font-display text-pool-deep text-xl font-extrabold"
        >
          Esta temporada
        </h2>
      </div>
      <div className="border-pool-deep/65 bg-paper-card mt-2 overflow-hidden rounded-2xl border-2">
        <dl className="bg-pool-deep grid grid-cols-3 gap-2 p-2.5 text-white">
          <PrimaryStat label="Partidos" value={stats.matches} />
          <PrimaryStat label="Goles" value={stats.matches ? stats.goals : "—"} featured />
          <PrimaryStat label="Asistencias" value={stats.matches ? stats.assists : "—"} />
        </dl>
        <dl className="grid grid-cols-2 gap-2 p-3">
          <SecondaryStat label="Expulsiones" value={exclusions} />
          <SecondaryStat label="MVP" value={mvpCount ?? "—"} />
          <SecondaryStat label="Goles / partido" value={formatAverage(stats.goalsPerMatch)} />
          <SecondaryStat label="Asist. / partido" value={formatAverage(stats.assistsPerMatch)} />
          <SecondaryStat label="Tiros" value={stats.shots} />
          <SecondaryStat
            label="Eficacia de tiro"
            value={
              stats.shootingPercent == null ? "—" : `${formatAverage(stats.shootingPercent)} %`
            }
          />
          {stats.saves > 0 ? <SecondaryStat label="Paradas" value={stats.saves} /> : null}
          {stats.conceded > 0 ? (
            <SecondaryStat label="Goles recibidos" value={stats.conceded} />
          ) : null}
        </dl>
      </div>
    </section>
  );
}

function PrimaryStat({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string | number;
  featured?: boolean;
}) {
  return (
    <div className="flex h-24 min-w-0 flex-col items-center justify-center rounded-xl border border-white/30 bg-white/10 px-0.5 text-center">
      <dt className="order-2 mt-2 text-sm font-bold text-white">{label}</dt>
      <dd
        className={`order-1 flex h-10 items-center justify-center font-mono text-4xl leading-none font-extrabold tabular-nums ${featured ? "text-ball-gold" : "text-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SecondaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-pool-deep/65 text-pool-deep flex h-24 min-w-0 flex-col items-center justify-center rounded-xl border bg-blue-50 px-2 text-center">
      <dt className="order-2 mt-1 flex min-h-9 items-center justify-center text-sm leading-tight font-bold">
        {label}
      </dt>
      <dd className="order-1 flex h-8 items-center justify-center font-mono text-2xl leading-none font-extrabold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function formatAverage(value: number | null) {
  return value == null
    ? "—"
    : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value);
}

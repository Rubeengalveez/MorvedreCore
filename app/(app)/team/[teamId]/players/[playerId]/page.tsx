import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck, Goal, Shield, Trophy, Waves } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getTeamById, getTeamRoster } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Jugador — Morvedre Core",
  description: "Ficha deportiva del jugador en su equipo.",
};

export default async function TeamPlayerPage({
  params,
}: {
  params: Promise<{ teamId: string; playerId: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { teamId, playerId } = await params;
  const [team, roster] = await Promise.all([getTeamById(teamId), getTeamRoster(teamId)]);
  if (!team) notFound();

  const player = roster.find((item) => item.player_id === playerId);
  if (!player) notFound();

  const supabase = await createClient();
  const { data: snapshot } = await supabase
    .from("ranking_snapshots")
    .select(
      "matches_played, matches_called, goals, exclusions, mvp_count, trainings_attended, trainings_total, attendance_pct, attendance_streak",
    )
    .eq("season_id", team.season_id)
    .eq("scope", "team")
    .eq("scope_key", team.id)
    .eq("player_id", player.player_id)
    .maybeSingle();

  const currentYear = new Date().getFullYear();
  const age = player.birth_year != null ? currentYear - player.birth_year : null;
  const number = player.squad_number ?? player.cap_number;
  const rosterHref = `/team/${team.id}?tab=jugadores` as Route;
  const matchesPlayed = snapshot?.matches_played ?? 0;
  const goalsPerMatch = matchesPlayed > 0 ? (snapshot?.goals ?? 0) / matchesPlayed : 0;
  const exclusionsPerMatch = matchesPlayed > 0 ? (snapshot?.exclusions ?? 0) / matchesPlayed : 0;
  const mvpRate =
    matchesPlayed > 0 ? Math.round(((snapshot?.mvp_count ?? 0) / matchesPlayed) * 100) : 0;

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <Link
        href={rosterHref}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la plantilla
      </Link>

      <header className="border-ink-200 bg-paper-card shadow-elev-2 overflow-hidden rounded-[1.75rem] border">
        <div className="bg-pool-deep h-20" aria-hidden="true" />
        <div className="px-5 pb-6 sm:px-7 sm:pb-7">
          <div className="-mt-14 flex items-end justify-between gap-4">
            <Avatar
              src={player.photo_url}
              name={player.full_name}
              size={112}
              teamColor={team.color}
              className="border-paper-card ring-paper-card border-4 ring-2"
            />
            {number != null ? (
              <div className="bg-pool-deep text-paper shadow-elev-2 flex h-14 min-w-14 items-center justify-center rounded-2xl px-3 font-mono text-2xl font-extrabold tabular-nums">
                {number}
              </div>
            ) : null}
          </div>

          <p className="text-pool-blue mt-5 text-xs font-extrabold tracking-[0.12em] uppercase">
            {team.label}
          </p>
          <h1 className="font-display text-pool-deep mt-1 text-3xl leading-tight font-extrabold tracking-tight text-balance">
            {player.full_name}
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            {player.birth_year
              ? `Nacido en ${player.birth_year}`
              : "Año de nacimiento no disponible"}
            {age != null ? ` · ${age} años` : ""}
          </p>
        </div>
      </header>

      {snapshot ? (
        <>
          <section aria-labelledby="player-season-heading">
            <div className="px-1">
              <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                Temporada
              </p>
              <h2
                id="player-season-heading"
                className="font-display text-pool-deep text-xl font-extrabold"
              >
                Rendimiento con el equipo
              </h2>
            </div>

            <dl className="border-ink-200 bg-paper-card divide-ink-200 mt-3 grid grid-cols-3 divide-x overflow-hidden rounded-2xl border shadow-sm">
              <PrimaryStat label="Partidos" value={snapshot.matches_played} />
              <PrimaryStat label="Goles" value={snapshot.goals} />
              <PrimaryStat label="Asistencia" value={`${snapshot.attendance_pct}%`} />
            </dl>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <StatGroup
              title="Competición"
              rows={[
                { label: "Convocatorias", value: snapshot.matches_called, icon: CalendarCheck },
                {
                  label: "Goles por partido",
                  value: goalsPerMatch.toLocaleString("es-ES", { maximumFractionDigits: 2 }),
                  icon: Goal,
                },
                {
                  label: "Exclusiones por partido",
                  value: exclusionsPerMatch.toLocaleString("es-ES", {
                    maximumFractionDigits: 2,
                  }),
                  icon: Shield,
                },
                {
                  label: "Partidos como MVP",
                  value: `${snapshot.mvp_count} · ${mvpRate}%`,
                  icon: Trophy,
                },
              ]}
            />
            <StatGroup
              title="Entrenamientos"
              rows={[
                {
                  label: "Sesiones completadas",
                  value: `${snapshot.trainings_attended} de ${snapshot.trainings_total}`,
                  icon: Waves,
                },
                { label: "Racha de asistencia", value: snapshot.attendance_streak, icon: Goal },
              ]}
            />
          </div>
        </>
      ) : (
        <section className="border-ink-200 bg-paper-card flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center">
          <Waves className="text-ink-400 h-7 w-7" aria-hidden="true" />
          <h2 className="font-display text-pool-deep mt-3 text-lg font-extrabold">
            Sin estadísticas todavía
          </h2>
          <p className="text-ink-500 mt-1 max-w-sm text-sm leading-relaxed">
            La actividad de esta temporada aparecerá aquí cuando se registren partidos y
            entrenamientos.
          </p>
        </section>
      )}
    </PageShell>
  );
}

function PrimaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-4 sm:py-5">
      <dd className="font-display text-pool-deep text-2xl font-extrabold tabular-nums sm:text-3xl">
        {value}
      </dd>
      <dt className="text-ink-500 mt-1 truncate text-xs font-extrabold tracking-wide uppercase">
        {label}
      </dt>
    </div>
  );
}

function StatGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}) {
  return (
    <section aria-labelledby={`player-${title.toLocaleLowerCase("es-ES")}`}>
      <h2
        id={`player-${title.toLocaleLowerCase("es-ES")}`}
        className="font-display text-pool-deep mb-3 px-1 text-lg font-extrabold"
      >
        {title}
      </h2>
      <dl className="border-ink-200 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-2xl border shadow-sm">
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className="bg-pool-foam text-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            >
              <Icon className="h-5 w-5" />
            </span>
            <dt className="text-ink-600 min-w-0 flex-1 text-sm font-semibold">{label}</dt>
            <dd className="text-pool-deep shrink-0 font-mono text-lg font-extrabold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

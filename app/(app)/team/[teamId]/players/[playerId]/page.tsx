import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { CalendarCheck, Shield, Trophy, Waves } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { getPlayerProfileBackTarget } from "@/lib/domain/player-profile-navigation";
import { formatSwimTime, getSwimProfileSummary } from "@/lib/domain/swim-times";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getPlayerTeamActaStats } from "@/server/queries/rankings";
import { getSwimTimeEntries } from "@/server/queries/swim-times";
import { getTeamById, getTeamRoster } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Jugador — Morvedre Core",
  description: "Ficha deportiva del jugador en su equipo.",
};

export default async function TeamPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; playerId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { teamId, playerId } = await params;
  const { from } = await searchParams;
  const [team, roster] = await Promise.all([getTeamById(teamId), getTeamRoster(teamId)]);
  if (!team) notFound();

  const player = roster.find((item) => item.player_id === playerId);
  if (!player) notFound();

  const supabase = await createClient();
  const [snapshotResult, actaStats, swimEntries] = await Promise.all([
    supabase
      .from("ranking_snapshots")
      .select("matches_played, matches_called, exclusions, mvp_count")
      .eq("season_id", team.season_id)
      .eq("scope", "team")
      .eq("scope_key", team.id)
      .eq("player_id", player.player_id)
      .maybeSingle(),
    getPlayerTeamActaStats({ seasonId: team.season_id, teamId: team.id, playerId }),
    getSwimTimeEntries({ playerId }),
  ]);
  if (snapshotResult.error) throw new Error("No pudimos cargar las estadísticas del jugador.");

  const snapshot = snapshotResult.data;
  const swim = getSwimProfileSummary(swimEntries);
  const number = player.squad_number ?? player.cap_number;
  const backTarget = getPlayerProfileBackTarget(from, team.id);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <PageBackLink href={backTarget.href as Route}>{backTarget.label}</PageBackLink>

      <header className="bg-pool-deep shadow-elev-2 relative overflow-hidden rounded-[1.75rem] text-white">
        <span className="lane-pattern pointer-events-none absolute inset-0 opacity-15" aria-hidden="true" />
        <span className="bg-pool-blue/20 pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
          <div className="relative shrink-0">
            <span aria-hidden="true" className="inline-flex rounded-full ring-4 ring-white/25">
              <Avatar
                src={player.photo_url}
                name={player.full_name}
                size={player.photo_url ? 128 : 104}
                teamColor={team.color}
                className="border-4 shadow-elev-2"
              />
            </span>
            {number != null ? (
              <span className="bg-ball-gold text-pool-deep absolute -right-2 -bottom-1 flex h-12 min-w-12 items-center justify-center rounded-2xl px-2 font-mono text-xl font-extrabold tabular-nums shadow-elev-2">
                <span className="sr-only">Dorsal </span>
                {number}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 py-1">
            <p className="text-ball-gold text-xs font-extrabold tracking-[0.1em] uppercase">
              {team.label}
            </p>
            <h1 className="font-display mt-2 text-lg leading-[1.12] font-extrabold tracking-tight break-words min-[380px]:text-[1.375rem] sm:text-2xl">
              {player.full_name}
            </h1>
            {player.birth_year != null ? (
              <p className="mt-2 text-sm font-medium text-white/85">Nacido en {player.birth_year}</p>
            ) : null}
          </div>
        </div>
      </header>

      <section aria-labelledby="player-season-heading">
        <div className="px-1">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">Esta temporada</p>
          <h2 id="player-season-heading" className="font-display text-pool-deep text-xl font-extrabold">
            Rendimiento con el equipo
          </h2>
        </div>
        <dl className="bg-pool-deep mt-3 grid grid-cols-3 gap-2 rounded-2xl p-3 text-white shadow-sm">
          <PrimaryStat label="Partidos" value={snapshot?.matches_played ?? "—"} />
          <PrimaryStat label="Goles" value={actaStats.goals} featured />
          <PrimaryStat label="Asistencias" value={actaStats.assists} />
        </dl>
        <p className="text-ink-600 mt-2 px-1 text-sm leading-snug">
          Goles y asistencias de partidos finalizados con acta.
        </p>
      </section>

      <section aria-labelledby="player-swim-heading">
        <div className="flex items-center gap-2 px-1">
          <Waves className="text-pool-blue h-5 w-5" aria-hidden="true" />
          <h2 id="player-swim-heading" className="font-display text-pool-deep text-xl font-extrabold">
            Tiempos de nado
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
          <SwimDistanceCard distance={50} latest={swim.latest50} best={swim.best50} />
          <SwimDistanceCard distance={100} latest={swim.latest100} best={swim.best100} />
        </div>
      </section>

      {snapshot ? (
        <section aria-labelledby="player-more-heading">
          <h2 id="player-more-heading" className="font-display text-pool-deep px-1 text-xl font-extrabold">
            Más datos de la temporada
          </h2>
          <dl className="bg-paper-card mt-3 grid grid-cols-3 gap-2 rounded-2xl p-3 shadow-sm">
            <SecondaryStat label="Convocatorias" value={snapshot.matches_called} icon={CalendarCheck} />
            <SecondaryStat label="Expulsiones" value={snapshot.exclusions} icon={Shield} />
            <SecondaryStat label="MVP" value={snapshot.mvp_count} icon={Trophy} />
          </dl>
        </section>
      ) : null}
    </PageShell>
  );
}

function PrimaryStat({ label, value, featured = false }: {
  label: string;
  value: string | number;
  featured?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-0.5 py-2 text-center">
      <dt className="order-2 mt-1 text-xs font-bold tracking-wide text-white/85 uppercase">
        {label}
      </dt>
      <dd className={`order-1 font-mono text-3xl font-extrabold tabular-nums ${featured ? "text-ball-gold" : "text-white"}`}>
        {value}
      </dd>
    </div>
  );
}

function SwimDistanceCard({ distance, latest, best }: {
  distance: 50 | 100;
  latest: number | null;
  best: number | null;
}) {
  return (
    <article aria-labelledby={`swim-${distance}-heading`} className="bg-paper-card rounded-2xl p-2.5 shadow-sm sm:p-4">
      <h3 id={`swim-${distance}-heading`} className="font-display text-pool-deep px-1 text-lg font-extrabold">
        {distance} m
      </h3>
      <dl className="mt-2 flex flex-col gap-2">
        <SwimValue label="Actual" value={latest} />
        <SwimValue label="Mejor" value={best} />
      </dl>
    </article>
  );
}

function SwimValue({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-pool-ice rounded-xl px-2.5 py-2">
      <dt className="text-ink-700 text-xs font-bold">{label}</dt>
      <dd className={`text-pool-deep mt-0.5 font-mono font-extrabold tabular-nums ${value == null ? "text-sm" : "text-base min-[360px]:text-lg"}`}>
        {value == null ? "Sin marca" : formatSwimTime(value)}
      </dd>
    </div>
  );
}

function SecondaryStat({ label, value, icon: Icon }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-0.5 py-1 text-center">
      <Icon className="text-pool-blue mb-1 h-5 w-5" aria-hidden="true" />
      <dt className="text-ink-700 order-2 mt-1 text-xs font-bold leading-tight">
        {label}
      </dt>
      <dd className="text-pool-deep order-1 font-mono text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChartNoAxesColumn, Waves } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { getPlayerProfileBackTarget } from "@/lib/domain/player-profile-navigation";
import { validCapNumber } from "@/lib/domain/cap-number";
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
  searchParams: Promise<{ from?: string; returnTo?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { teamId, playerId } = await params;
  const { from, returnTo } = await searchParams;
  const [team, roster] = await Promise.all([getTeamById(teamId), getTeamRoster(teamId)]);
  if (!team) notFound();

  const supabase = await createClient();
  let player = roster.find((item) => item.player_id === playerId);
  if (!player && from === "rankings") {
    const { data: membership } = await supabase
      .from("team_rosters")
      .select("squad_number")
      .eq("team_id", teamId)
      .eq("player_id", playerId)
      .limit(1)
      .maybeSingle();
    if (membership) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, birth_year, cap_number, is_active")
        .eq("id", playerId)
        .maybeSingle();
      if (profile?.is_active) {
        player = {
          player_id: profile.id,
          squad_number: membership.squad_number,
          full_name: profile.full_name,
          photo_url: profile.photo_url,
          birth_year: profile.birth_year,
          cap_number: profile.cap_number,
        };
      }
    }
  }
  if (!player) notFound();

  const [snapshotResult, actaStats, swimEntries] = await Promise.all([
    supabase
      .from("ranking_snapshots")
      .select("matches_played, exclusions, mvp_count")
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
  const number = validCapNumber(player.squad_number ?? player.cap_number);
  const backTarget = getPlayerProfileBackTarget(from, team.id, returnTo, playerId);

  return (
    <PageShell width="md" className="gap-3 pb-4">
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
        <div className="flex items-center gap-2 px-1">
          <ChartNoAxesColumn className="text-pool-blue h-5 w-5" aria-hidden="true" />
          <h2 id="player-season-heading" className="font-display text-pool-deep text-xl font-extrabold">
            Esta temporada
          </h2>
        </div>
        <div className="bg-paper-card shadow-elev-1 mt-2 overflow-hidden rounded-2xl">
          <div className="bg-pool-deep relative overflow-hidden">
            <span className="lane-pattern pointer-events-none absolute inset-0 opacity-15" aria-hidden="true" />
            <dl className="relative grid grid-cols-3 gap-2 p-2.5 text-white">
              <PrimaryStat label="Expulsiones" value={snapshot?.exclusions ?? "—"} />
              <PrimaryStat label="Goles" value={actaStats.goals} featured />
              <PrimaryStat label="Asistencias" value={actaStats.assists} />
            </dl>
          </div>
          {snapshot ? (
            <dl className="grid grid-cols-2 gap-2 p-2.5">
              <SecondaryStat label="Partidos" value={snapshot.matches_played} />
              <SecondaryStat label="MVP" value={snapshot.mvp_count} />
            </dl>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="player-swim-heading">
        <div className="flex items-center gap-2 px-1">
          <Waves className="text-pool-blue h-5 w-5" aria-hidden="true" />
          <h2 id="player-swim-heading" className="font-display text-pool-deep text-xl font-extrabold">
            Tiempos de nado
          </h2>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <SwimDistanceCard distance={50} latest={swim.latest50} best={swim.best50} />
          <SwimDistanceCard distance={100} latest={swim.latest100} best={swim.best100} />
        </div>
      </section>

    </PageShell>
  );
}

function PrimaryStat({ label, value, featured = false }: {
  label: string;
  value: string | number;
  featured?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-2 text-center ${featured ? "bg-white/10" : ""}`}>
      <dt className="order-2 mt-1 text-xs font-bold text-white/90 uppercase min-[360px]:text-[0.8125rem]">
        {label}
      </dt>
      <dd className={`order-1 font-mono text-4xl leading-none font-extrabold tabular-nums ${featured ? "text-ball-gold" : "text-white"}`}>
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
    <article aria-labelledby={`swim-${distance}-heading`} className="bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl">
      <h3 id={`swim-${distance}-heading`} className="font-display bg-pool-deep px-3 py-2 text-center text-lg font-extrabold text-white">
        {distance} metros
      </h3>
      <dl className="grid grid-cols-2 gap-2 px-3 py-2.5">
        <SwimValue label="Actual" value={latest} />
        <SwimValue label="Mejor" value={best} highlight />
      </dl>
    </article>
  );
}

function SwimValue({ label, value, highlight = false }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <dt className="text-ink-700 order-2 mt-0.5 text-sm font-bold">{label}</dt>
      <dd className={`order-1 font-mono text-xl leading-tight font-extrabold whitespace-nowrap tabular-nums ${highlight ? "text-pool-blue" : "text-pool-deep"}`}>
        {value == null ? "Sin marca" : formatSwimTime(value)}
      </dd>
    </div>
  );
}

function SecondaryStat({ label, value }: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-pool-ice flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2">
      <dt className="order-2 text-sm font-bold leading-tight text-ink-700">
        {label}
      </dt>
      <dd className="text-pool-deep order-1 font-mono text-2xl leading-none font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

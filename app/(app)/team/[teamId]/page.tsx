import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { Trophy, Minus, TrendingDown, ChevronRight } from "lucide-react";

import { Equipo } from "@/components/brand/pictograms";
import { EmptyTeamState } from "@/components/team/empty-team-state";
import { TeamHero } from "@/components/team/team-hero";
import { TeamRosterList } from "@/components/team/team-roster-list";
import { TeamStaffList } from "@/components/team/team-staff-list";
import { WaterDivider } from "@/components/ui/water-divider";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSeason } from "@/server/queries/seasons";
import {
  getTeamById,
  getTeamRoster,
  getTeamStaff,
} from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team) {
    return { title: "Equipo — Morvedre Core" };
  }
  return {
    title: `${team.label} — Morvedre Core`,
    description: `Plantilla y cuerpo técnico de ${team.label}.`,
  };
}

interface LastMatch {
  id: string;
  opponent: string;
  scheduled_at: string;
  final_score_us: number | null;
  final_score_them: number | null;
  status: string;
}

async function getLastMatch(teamId: string): Promise<LastMatch | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, opponent, scheduled_at, status, final_score_us, final_score_them")
    .eq("team_id", teamId)
    .eq("status", "played")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data as LastMatch;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team) notFound();

  const [roster, staff, season, lastMatch] = await Promise.all([
    getTeamRoster(team.id),
    getTeamStaff(team.id),
    getCurrentSeason(),
    getLastMatch(team.id),
  ]);

  const currentYear = new Date().getFullYear();
  const inSeason = season
    ? team.season_id === season.id
    : false;
  const seasonLabel = inSeason ? season?.label ?? null : null;

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-6">
        <TeamHero
          team={team}
          seasonLabel={seasonLabel}
          homePool={team.home_pool}
        />

        {lastMatch ? (
          <section
            aria-labelledby="last-match-heading"
            className="mt-4 flex flex-col gap-2"
          >
            <h2
              id="last-match-heading"
              className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
            >
              Último resultado
            </h2>
            <LastMatchCard
              match={lastMatch}
              teamColor={team.color}
            />
          </section>
        ) : null}
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <TeamStaffList staff={staff} teamColor={team.color} />
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {roster.length === 0 ? (
          <EmptyTeamState
            pictogram={
              <Equipo className="h-12 w-12" accent="var(--brand-aqua)" />
            }
            title="Aún no hay plantilla"
            description="Cuando el admin dé de alta a los jugadores de este equipo, aparecerán aquí con su dorsal."
          />
        ) : (
          <TeamRosterList
            players={roster}
            teamColor={team.color}
            currentYear={currentYear}
          />
        )}
      </div>
    </div>
  );
}

function LastMatchCard({
  match,
  teamColor,
}: {
  match: LastMatch;
  teamColor: string;
}) {
  const isWin =
    match.final_score_us != null &&
    match.final_score_them != null &&
    match.final_score_us > match.final_score_them;
  const isDraw =
    match.final_score_us != null &&
    match.final_score_them != null &&
    match.final_score_us === match.final_score_them;
  const resultTone = isWin
    ? { label: "V", color: "var(--success)", bg: "color-mix(in oklab, var(--success) 12%, var(--paper))" }
    : isDraw
      ? { label: "E", color: "var(--ink-600)", bg: "color-mix(in oklab, var(--ink-300) 30%, var(--paper))" }
      : { label: "D", color: "var(--danger)", bg: "color-mix(in oklab, var(--danger) 12%, var(--paper))" };
  const Icon = isWin ? Trophy : isDraw ? Minus : TrendingDown;

  return (
    <Link
      href={`/matches/${match.id}` as Route}
      className="group flex items-center gap-3 overflow-hidden rounded-md border border-ink-300 bg-paper p-3 transition-colors hover:border-brand-blue hover:bg-brand-foam"
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: teamColor,
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: resultTone.bg, color: resultTone.color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-1 flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
          {resultTone.label === "V"
            ? "Victoria"
            : resultTone.label === "E"
              ? "Empate"
              : "Derrota"}
        </span>
        <span className="font-display text-base font-extrabold text-brand-deep">
          vs {match.opponent}
        </span>
        <span className="text-[11px] text-ink-600">
          {new Date(match.scheduled_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · {match.final_score_us}-{match.final_score_them}
        </span>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-600 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

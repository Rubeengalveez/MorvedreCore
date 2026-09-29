import { DelegateMatchEntry } from "@/components/matches/delegate-match-entry";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { canManageTeam, canUseLiveMatch } from "@/lib/domain/permissions";
import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { FileText, UserCheck, Pencil, UsersRound } from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { PoolScoreboard } from "@/components/ui/pool-scoreboard";
import { sheetSchema } from "@/lib/domain/live-match";
import { getMatchScoreboardState } from "@/lib/domain/match-scoreboard-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { MapLocationLink } from "@/components/ui/map-location-link";
import { formatLongDate } from "@/lib/domain/calendar";
import { validCapNumber } from "@/lib/domain/cap-number";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getMatchById,
  getMatchMvp,
  type CallupDetail,
  type MatchScorer,
} from "@/server/queries/matches";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPETITION_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchById(id).catch(() => null);
  if (!match) {
    return { title: "Partido — Morvedre Core" };
  }
  return {
    title: `${match.team_label} vs ${match.opponent} — Morvedre Core`,
    description: `${COMPETITION_LABELS[match.competition_type] ?? match.competition_type} · ${formatLongDate(match.scheduled_at)}`,
  };
}

async function getVisibleCallups(matchId: string): Promise<CallupDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_callups")
    .select(
      "match_id, player_id, cap_number, status, confirmed_at, source_team_id, profiles!match_callups_player_id_fkey(full_name)",
    )
    .eq("match_id", matchId)
    .in("status", ["called", "confirmed"])
    .not("cap_number", "is", null)
    .order("cap_number", { ascending: true });
  if (error) throw error;
  const out: CallupDetail[] = [];
  for (const row of (data ?? []) as Array<{
    match_id: string;
    player_id: string;
    cap_number: number | null;
    status: string;
    confirmed_at: string | null;
    source_team_id: string | null;
    profiles: unknown;
  }>) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const profileObj = profile as { full_name?: string } | null;
    out.push({
      match_id: row.match_id,
      player_id: row.player_id,
      full_name: profileObj?.full_name ?? "Sin nombre",
      cap_number: row.cap_number,
      status: row.status,
      confirmed_at: row.confirmed_at,
      source_team_id: row.source_team_id,
    });
  }
  return out;
}

async function getMatchStatsList(
  matchId: string,
): Promise<Array<{ player_id: string; goals: number; exclusions: number; mvp: boolean }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_stats")
    .select("player_id, goals, exclusions, mvp")
    .eq("match_id", matchId);
  return (data ?? []) as Array<{
    player_id: string;
    goals: number;
    exclusions: number;
    mvp: boolean;
  }>;
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ctx, match] = await Promise.all([getActiveProfileContext(), getMatchById(id)]);
  if (!ctx) redirect("/login");
  if (!match) notFound();

  const [callups, mvp, statsList] = await Promise.all([
    getVisibleCallups(id).catch(() => [] as CallupDetail[]),
    getMatchMvp(id).catch(() => null as MatchScorer | null),
    getMatchStatsList(id).catch(() => []),
  ]);

  const statsMap = new Map(statsList.map((s) => [s.player_id, s]));

  const access = await getRenderAdminAccess();
  const delegate = canUseLiveMatch(access, match.team_id);
  const canEditCallup = canManageTeam(access, "match_operations", match.team_id);
  const canEditMatch = canManageTeam(access, "match_schedule", match.team_id);
  const isPlayed = match.status === "played";
  const { data: liveSheet } = await (
    await createClient()
  )
    .from("live_match_sheets")
    .select("match_id,document")
    .eq("match_id", id)
    .maybeSingle();

  const parsedSheet = sheetSchema.safeParse(liveSheet?.document);
  const scoreboard = getMatchScoreboardState({
    status: match.status,
    isHome: match.is_home,
    finalScoreUs: match.final_score_us,
    finalScoreThem: match.final_score_them,
    sheet: parsedSheet.success ? parsedSheet.data : null,
  });

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <PageBackLink href="/calendar">Calendario</PageBackLink>
        {canEditMatch ? (
          <Link
            href={`/admin/matches/${match.id}/editar?from=match` as Route}
            className="text-pool-blue focus-visible:outline-pool-blue inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold focus-visible:outline-2"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> Editar partido
          </Link>
        ) : null}
      </div>
      {delegate && (
        <DelegateMatchEntry matchId={match.id} started={Boolean(liveSheet)} finished={isPlayed} />
      )}
      <h1 className="sr-only">
        {match.team_label} contra {match.opponent}
      </h1>

      <div className="flex flex-col gap-3">
        <PoolScoreboard
          className="border-pool-deep/75 border-2"
          regulationScore={scoreboard.regulationScore}
          mode={scoreboard.mode}
          homeTeam={{
            label: match.is_home ? "Morvedre" : match.opponent,
            color: match.is_home ? match.team_color : "#64748B",
          }}
          awayTeam={{
            label: match.is_home ? match.opponent : "Morvedre",
            color: match.is_home ? "#64748B" : match.team_color,
          }}
          homeScore={scoreboard.homeScore}
          awayScore={scoreboard.awayScore}
          period={scoreboard.period}
          liveLabel={scoreboard.liveLabel}
          scheduledAt={match.scheduled_at}
          competitionLabel={COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
          isHome={match.is_home}
          location={null}
          mvp={
            isPlayed && mvp
              ? {
                  name: mvp.full_name,
                  cap: validCapNumber(mvp.cap_number),
                  goals: mvp.goals,
                  assists: mvp.assists ?? 0,
                }
              : null
          }
        />
        {match.location || match.maps_url ? (
          <MapLocationLink
            name={match.location}
            address={match.location}
            mapsUrl={match.maps_url}
            compact
            className="border-ink-200 bg-paper-card border"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <section className="bg-paper-card border-pool-deep/75 shadow-elev-1 overflow-hidden rounded-2xl border-2">
          <div className="bg-pool-deep text-paper flex min-h-14 items-center gap-2.5 px-4 py-2.5">
            <h2 className="text-lg font-black">Convocatoria</h2>
            <span
              className="bg-paper/15 text-paper inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-extrabold"
              aria-label={`${callups.length} ${callups.length === 1 ? "jugador" : "jugadores"}`}
              title={`${callups.length} ${callups.length === 1 ? "jugador" : "jugadores"}`}
            >
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              {callups.length}
            </span>
          </div>

          <div className="p-3">
            {canEditCallup && (!liveSheet || delegate) ? (
              <Link
                href={
                  (liveSheet
                    ? `/acta/convocatoria?match=${match.id}&from=match`
                    : `/admin/matches/${match.id}?from=match`) as Route
                }
                className="border-pool-blue/40 bg-pool-foam text-pool-deep focus-visible:outline-pool-blue mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-extrabold focus-visible:outline-2"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar convocatoria
              </Link>
            ) : null}
            {callups.length === 0 ? (
              <EmptyState
                icon={<UserCheck className="h-6 w-6" aria-hidden="true" />}
                title="Convocatoria pendiente"
                description="Cuando el entrenador la publique, aparecerá aquí."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {callups.map((c) => {
                  const stats = statsMap.get(c.player_id);
                  return (
                    <li
                      key={c.player_id}
                      className="bg-paper-card border-pool-deep/55 shadow-elev-1 flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 select-none"
                    >
                      <div
                        className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-base font-black"
                        aria-label={
                          validCapNumber(c.cap_number) != null
                            ? `Gorro ${c.cap_number}`
                            : "Sin gorro"
                        }
                      >
                        {validCapNumber(c.cap_number) ?? "–"}
                      </div>
                      <span className="text-ink-900 min-w-0 flex-1 text-sm font-bold">
                        <AdaptivePlayerName name={c.full_name} />
                      </span>
                      {isPlayed && stats && (stats.goals > 0 || stats.exclusions > 0) && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {stats.goals > 0 && (
                            <span className="bg-pool-foam text-pool-deep rounded-full px-2.5 py-1 text-xs font-bold">
                              {stats.goals} {stats.goals === 1 ? "gol" : "goles"}
                            </span>
                          )}
                          {stats.exclusions > 0 && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              {stats.exclusions} {stats.exclusions === 1 ? "exp." : "exp."}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {match.notes && (
          <section className="bg-paper-card border-ink-200 shadow-elev-1 flex flex-col gap-3 rounded-2xl border p-5">
            <h2 className="text-ink-900 flex items-center gap-2 text-sm font-bold">
              <FileText className="text-ink-400 h-4 w-4" />
              Notas
            </h2>
            <p className="text-ink-700 text-sm leading-relaxed whitespace-pre-line">
              {match.notes}
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}

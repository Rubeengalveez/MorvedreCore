import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { Star, Shield, Award, Calendar, Trophy, CircleDot, Flame } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Balon, Porteria, Silbato } from "@/components/brand/pictograms";
import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { PoolScoreboard } from "@/components/ui/pool-scoreboard";
import { Tabs } from "@/components/ui/tabs";
import { TeamHero } from "@/components/team/team-hero";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getRankings } from "@/server/queries/rankings";
import {
  getStreakForTeam,
  getStreaksForPlayer,
  type ActiveStreakRow,
} from "@/server/queries/streaks";
import { getTeamById, getTeamMatches, getTeamRoster, getTeamStaff } from "@/server/queries/teams";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";

import { TeamPlayersTab } from "./_components/team-players-tab";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamTabId = "principal" | "jugadores" | "partidos";

const TEAM_TABS: Array<{ id: TeamTabId; label: string }> = [
  { id: "principal", label: "Principal" },
  { id: "jugadores", label: "Jugadores" },
  { id: "partidos", label: "Partidos" },
];

function parseTab(value: string | undefined): TeamTabId {
  if (value === "jugadores" || value === "partidos") return value;
  return "principal";
}

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
    description: `Plantilla, cuerpo técnico y partidos de ${team.label}.`,
  };
}

function competitionLabel(type: string | null | undefined): string {
  if (type === "tournament") return "Torneo";
  if (type === "friendly") return "Amistoso";
  if (type === "cup") return "Copa";
  return "Liga";
}

function toActiveStreak(row: ActiveStreakRow): ActiveStreak {
  return {
    type: row.type,
    current_value: row.current_value,
    best_value: row.best_value,
  };
}

function relativeDay(iso: string, now: Date): string {
  const then = new Date(iso);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  then.setHours(0, 0, 0, 0);
  const diff = Math.round((then.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) return `En ${diff} días`;
  if (diff < -1 && diff > -7) return `Hace ${Math.abs(diff)} días`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile } = ctx;

  const { teamId } = await params;
  const sp = await searchParams;
  const activeTab = parseTab(sp.tab);

  const team = await getTeamById(teamId);
  if (!team) notFound();

  const season = await getCurrentSeason();
  const inSeason = season ? team.season_id === season.id : false;
  const seasonId = inSeason ? (season?.id ?? null) : null;
  const isMyTeam = seasonId
    ? ownProfile.id === activeProfile.id
      ? await isProfileOnTeam(ownProfile.id, team.id)
      : await isProfileOnTeam(activeProfile.id, team.id)
    : false;

  const supabase = await createClient();

  const [
    roster,
    staff,
    teamMatches,
    playerStreaks,
    teamWinStreak,
    teamSnapshotsRes,
    catGoalsRes,
    catExclRes,
    catMvpRes,
    catAttendanceRes,
  ] = await Promise.all([
    getTeamRoster(team.id),
    getTeamStaff(team.id),
    getTeamMatches(team.id, 20),
    seasonId
      ? getStreaksForPlayer(seasonId, activeProfile.id)
      : Promise.resolve([] as ActiveStreakRow[]),
    seasonId ? getStreakForTeam(seasonId, team.id, "wins_consec") : Promise.resolve(null),
    seasonId
      ? supabase
          .from("ranking_snapshots")
          .select("player_id, matches_played, matches_called, goals, exclusions, mvp_count, trainings_attended, trainings_total, attendance_pct, attendance_streak")
          .eq("season_id", seasonId)
          .eq("scope", "team")
          .eq("scope_key", team.id)
      : Promise.resolve({ data: [] }),
    seasonId
      ? getRankings({
          season_id: seasonId,
          scope: { kind: "category", category_code: team.category_code },
          metric: "goals",
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    seasonId
      ? getRankings({
          season_id: seasonId,
          scope: { kind: "category", category_code: team.category_code },
          metric: "exclusions",
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    seasonId
      ? getRankings({
          season_id: seasonId,
          scope: { kind: "category", category_code: team.category_code },
          metric: "mvp",
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    seasonId
      ? getRankings({
          season_id: seasonId,
          scope: { kind: "category", category_code: team.category_code },
          metric: "attendance",
          min_trainings_total: 3,
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
  ]);

  const categoryLeaders = {
    goals: catGoalsRes.rows[0] ?? null,
    exclusions: catExclRes.rows[0] ?? null,
    mvp: catMvpRes.rows[0] ?? null,
    attendance: catAttendanceRes.rows[0] ?? null,
  };

  const snapshots = (teamSnapshotsRes.data ?? []).map((row) => ({
    player_id: row.player_id,
    matches_played: row.matches_played,
    matches_called: row.matches_called,
    goals: row.goals,
    exclusions: row.exclusions,
    mvp_count: row.mvp_count,
    trainings_attended: row.trainings_attended,
    trainings_total: row.trainings_total,
    attendance_pct: Number(row.attendance_pct ?? 0),
    attendance_streak: row.attendance_streak,
  }));

  const now = new Date();
  const upcomingMatches = teamMatches
    .filter((m) => new Date(m.scheduled_at).getTime() >= now.getTime() - 1000 * 60 * 60 * 6)
    .filter((m) => m.status === "scheduled" || m.status === "in_progress" || m.status === "postponed")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const playedMatches = teamMatches
    .filter((m) => m.status === "played")
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  const lastMatch = playedMatches[0] ?? null;
  const nextMatch = upcomingMatches[0] ?? null;

  const coachName = staff.find((s) => s.role === "head_coach")?.full_name ?? "Sin asignar";
  const basePath = `/team/${team.id}` as Route;

  return (
    <div className="flex w-full flex-col">
      <LanePattern as="div" className="bg-paper" strong>
        <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-3">
          <TeamHero
            team={team}
            seasonLabel={inSeason ? (season?.label ?? null) : null}
            homePool={team.home_pool}
          />
        </div>
      </LanePattern>

      <div className="bg-paper sticky top-[60px] z-20 -mx-0">
        <div className="mx-auto max-w-2xl">
          <Tabs tabs={TEAM_TABS} active={activeTab} basePath={basePath} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        {activeTab === "principal" ? (
          <TeamPrincipal
            team={team}
            playerCount={roster.length}
            coachName={coachName}
            lastMatch={lastMatch}
            nextMatch={nextMatch}
            categoryLeaders={categoryLeaders}
            teamWinStreak={teamWinStreak}
            playerStreaks={playerStreaks}
            isMyTeam={isMyTeam}
          />
        ) : null}

        {activeTab === "jugadores" ? (
          <TeamPlayersTab roster={roster} teamColor={team.color} staff={staff} snapshots={snapshots} />
        ) : null}

        {activeTab === "partidos" ? (
          <TeamMatchesTab teamLabel={team.label} teamColor={team.color} matches={teamMatches} />
        ) : null}
      </div>
    </div>
  );
}

async function isProfileOnTeam(profileId: string, teamId: string): Promise<boolean> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_rosters")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", profileId)
    .is("left_at", null)
    .maybeSingle();
  if (data) return true;
  const { data: staff } = await supabase
    .from("team_staff")
    .select("id")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return staff != null;
}

function TeamPrincipal({
  team,
  playerCount,
  coachName,
  lastMatch,
  nextMatch,
  categoryLeaders,
  teamWinStreak,
  playerStreaks,
  isMyTeam,
}: {
  team: Awaited<ReturnType<typeof getTeamById>>;
  playerCount: number;
  coachName: string;
  lastMatch: any;
  nextMatch: any;
  categoryLeaders: {
    goals: any;
    exclusions: any;
    mvp: any;
    attendance: any;
  };
  teamWinStreak: ActiveStreakRow | null;
  playerStreaks: ActiveStreakRow[];
  isMyTeam: boolean;
}) {
  if (!team) return null;
  const categoryLabel = CATEGORY_LABELS[team.category_code as CategoryCode] ?? team.category_code;
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen del equipo */}
      <section className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-600 mb-3">
          Resumen del Equipo
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded border border-ink-300 bg-paper p-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Categoría</span>
            <p className="mt-1 font-display text-sm font-extrabold text-pool-deep truncate capitalize">
              {categoryLabel}
            </p>
          </div>
          <div className="rounded border border-ink-300 bg-paper p-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Plantilla</span>
            <p className="mt-1 font-display text-sm font-extrabold text-pool-deep truncate">
              {playerCount} {playerCount === 1 ? "jugador" : "jugadores"}
            </p>
          </div>
          <div className="rounded border border-ink-300 bg-paper p-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Entrenador</span>
            <p className="mt-1 font-display text-sm font-extrabold text-pool-deep truncate">
              {coachName}
            </p>
          </div>
        </div>
      </section>

      {/* Último resultado / Próximo partido */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Último resultado */}
        <section className="flex flex-col gap-2">
          <Eyebrow as="h3">Último resultado</Eyebrow>
          {lastMatch ? (
            <div className="flex flex-col gap-1.5">
              <Link
                href={`/matches/${lastMatch.id}` as Route}
                className="focus-visible:ring-pool-blue focus-visible:ring-offset-paper block rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <PoolScoreboard
                  mode="final"
                  homeTeam={{ label: team.label, color: team.color }}
                  awayTeam={{ label: lastMatch.opponent, color: "var(--goggle-red)" }}
                  homeScore={lastMatch.final_score_us}
                  awayScore={lastMatch.final_score_them}
                  scheduledAt={lastMatch.scheduled_at}
                  competitionLabel={competitionLabel(lastMatch.competition_type)}
                  isHome={lastMatch.is_home}
                  location={lastMatch.location ?? lastMatch.pool_name ?? null}
                />
              </Link>
              {lastMatch.final_score_us != null && lastMatch.final_score_them != null ? (
                <div className="bg-paper-card shadow-elev-1 tracking-eyebrow flex items-center gap-1.5 self-start rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase border border-ink-300">
                  {lastMatch.final_score_us > lastMatch.final_score_them ? (
                    <span className="text-success">Victoria</span>
                  ) : lastMatch.final_score_us === lastMatch.final_score_them ? (
                    <span className="text-ink-600">Empate</span>
                  ) : (
                    <span className="text-goggle-red">Derrota</span>
                  )}
                  <span className="text-ink-600">
                    · {relativeDay(lastMatch.scheduled_at, now)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-4 text-center text-xs">
              No hay partidos jugados.
            </div>
          )}
        </section>

        {/* Próximo partido */}
        <section className="flex flex-col gap-2">
          <Eyebrow as="h3">Próximo partido</Eyebrow>
          {nextMatch ? (
            <Link
              href={`/matches/${nextMatch.id}` as Route}
              className="focus-visible:ring-pool-blue focus-visible:ring-offset-paper block rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <PoolScoreboard
                mode="preview"
                homeTeam={{ label: team.label, color: team.color }}
                awayTeam={{ label: nextMatch.opponent, color: "var(--goggle-red)" }}
                scheduledAt={nextMatch.scheduled_at}
                competitionLabel={competitionLabel(nextMatch.competition_type)}
                isHome={nextMatch.is_home}
                location={nextMatch.location ?? nextMatch.pool_name ?? null}
              />
            </Link>
          ) : (
            <div className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-4 text-center text-xs">
              No hay partidos programados.
            </div>
          )}
        </section>
      </div>

      {/* Líderes de la Categoría */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <PictogramBadge pictogram={Trophy} color="var(--ball-gold)" size="sm" />
          <h2 className="font-display text-pool-deep text-base font-extrabold">
            Líderes de la Categoría ({categoryLabel})
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <LeaderStatCard
            title="Pichichi"
            player={categoryLeaders.goals}
            metricLabel="Goles"
            accent="bg-[#FF6B35]"
          />
          <LeaderStatCard
            title="Más MVP"
            player={categoryLeaders.mvp}
            metricLabel="MVPs"
            accent="bg-brand-ball"
          />
          <LeaderStatCard
            title="Exclusiones"
            player={categoryLeaders.exclusions}
            metricLabel="Excl."
            accent="bg-goggle-red"
          />
          <LeaderStatCard
            title="Asistencia"
            player={categoryLeaders.attendance}
            metricLabel="Asistencia"
            suffix="%"
            accent="bg-pool-teal"
          />
        </div>
      </section>

      {/* Racha del equipo */}
      {teamWinStreak && teamWinStreak.current_value > 0 ? (
        <div className="border border-[#FF6B35]/20 bg-[#FF6B35]/5 flex flex-wrap items-center gap-2 rounded-md p-3 shadow-sm">
          <Flame className="h-4 w-4 fill-[#FF6B35] text-[#FF6B35] animate-pulse" />
          <span className="text-ink-700 text-xs font-bold uppercase tracking-wider text-[#FF6B35]">Racha del equipo:</span>
          <span className="text-pool-deep font-mono text-base font-extrabold tabular-nums">
            {teamWinStreak.current_value} victorias seguidas
          </span>
          <span className="text-ink-500 text-[10px]">
            (récord histórico: {teamWinStreak.best_value})
          </span>
        </div>
      ) : null}

      {/* Tus rachas (jugador) */}
      {isMyTeam && playerStreaks.filter((s) => s.current_value > 0).length > 0 ? (
        <section
          aria-labelledby="my-streaks-heading"
          className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-3 rounded-md border p-4"
        >
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 fill-[#FF6B35] text-[#FF6B35] animate-pulse" />
            <h2
              id="my-streaks-heading"
              className="font-display text-pool-deep text-base font-extrabold"
            >
              Tus rachas activas
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {playerStreaks
              .filter((s) => s.current_value > 0)
              .map((streak) => {
                const meta = STREAK_METADATA[streak.type];
                return (
                  <div
                    key={streak.type}
                    title={`Récord histórico: ${streak.best_value}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-xs font-bold text-pool-deep shadow-sm"
                  >
                    <span className="text-[#FF6B35] font-extrabold">🔥 {streak.current_value}</span>
                    <span className="text-ink-600 text-[10px] font-semibold">{meta.label.split(" ")[0]}</span>
                  </div>
                );
              })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LeaderStatCard({
  title,
  player,
  metricLabel,
  suffix = "",
  accent,
}: {
  title: string;
  player: any;
  metricLabel: string;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="border border-ink-300 bg-paper flex flex-col rounded-md p-3 shadow-sm justify-between gap-3 transition-colors hover:border-pool-blue">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-600 leading-none">{title}</span>
        {player ? (
          <div className="flex items-center gap-2 mt-1">
            <Avatar name={player.full_name} src={player.photo_url} size={32} />
            <div className="flex flex-col min-w-0">
              <p className="font-display text-xs font-extrabold text-pool-deep leading-tight truncate">
                {player.full_name.split(" ")[0]}
              </p>
              <p className="text-[9px] text-ink-500 truncate leading-none mt-0.5">{player.team_label ?? "Sin equipo"}</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] italic text-ink-500 mt-1">Sin datos</p>
        )}
      </div>
      {player ? (
        <div className="flex items-baseline justify-between border-t border-ink-300/40 pt-1.5 mt-auto">
          <span className="text-[9px] font-bold uppercase text-ink-500">{metricLabel}</span>
          <span className="font-mono text-sm font-extrabold text-pool-deep tabular-nums">
            {player.primary_value}
            {suffix}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TeamMatchesTab({
  teamLabel,
  teamColor,
  matches,
}: {
  teamLabel: string;
  teamColor: string;
  matches: Awaited<ReturnType<typeof getTeamMatches>>;
}) {
  const now = new Date();
  const upcoming = matches
    .filter((m) => new Date(m.scheduled_at).getTime() >= now.getTime() - 1000 * 60 * 60 * 6)
    .filter(
      (m) => m.status === "scheduled" || m.status === "in_progress" || m.status === "postponed",
    )
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const played = matches
    .filter((m) => m.status === "played")
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return (
    <>
      <section aria-labelledby="upcoming-matches-heading" className="flex flex-col gap-2">
        <Eyebrow as="h2" id="upcoming-matches-heading">
          Próximos partidos
        </Eyebrow>
        {upcoming.length === 0 ? (
          <div className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-4 text-center text-sm">
            No hay partidos próximos.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}` as Route}
                  className="focus-visible:ring-pool-blue focus-visible:ring-offset-paper block rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <PoolScoreboard
                    mode="preview"
                    homeTeam={{ label: teamLabel, color: teamColor }}
                    awayTeam={{ label: m.opponent, color: "var(--goggle-red)" }}
                    scheduledAt={m.scheduled_at}
                    competitionLabel={competitionLabel(m.competition_type)}
                    isHome={m.is_home}
                    location={m.location ?? m.pool_name ?? null}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="played-matches-heading" className="flex flex-col gap-2">
        <Eyebrow as="h2" id="played-matches-heading">
          Últimos resultados
        </Eyebrow>
        {played.length === 0 ? (
          <div className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-4 text-center text-sm">
            Aún no se ha jugado ningún partido.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {played.map((m) => {
              const result = resultTag(m.final_score_us, m.final_score_them);
              return (
                <li key={m.id} className="flex flex-col gap-1.5">
                  <Link
                    href={`/matches/${m.id}` as Route}
                    className="focus-visible:ring-pool-blue focus-visible:ring-offset-paper block rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <PoolScoreboard
                      mode="final"
                      homeTeam={{ label: teamLabel, color: teamColor }}
                      awayTeam={{ label: m.opponent, color: "var(--goggle-red)" }}
                      homeScore={m.final_score_us}
                      awayScore={m.final_score_them}
                      scheduledAt={m.scheduled_at}
                      competitionLabel={competitionLabel(m.competition_type)}
                      isHome={m.is_home}
                      location={m.location ?? m.pool_name ?? null}
                    />
                  </Link>
                  <div className="bg-paper-card shadow-elev-1 tracking-eyebrow flex items-center gap-1.5 self-start rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase">
                    {result ? <span style={{ color: result.color }}>{result.label}</span> : null}
                    <span className="text-ink-600">
                      · {relativeDay(m.scheduled_at, now)} {timeOf(m.scheduled_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function resultTag(
  us: number | null,
  them: number | null,
): { label: string; color: string } | null {
  if (us == null || them == null) return null;
  if (us > them) return { label: "Victoria", color: "var(--success)" };
  if (us === them) return { label: "Empate", color: "var(--ink-600)" };
  return { label: "Derrota", color: "var(--goggle-red)" };
}

interface ActiveStreak {
  type: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec" | "wins_consec";
  current_value: number;
  best_value: number;
}

const STREAK_METADATA: Record<
  ActiveStreak["type"],
  { label: string; color: string; pictogram: React.ComponentType<{ className?: string; accent?: string }> }
> = {
  goals_consec: {
    label: "Goles seguidos",
    color: "var(--success)",
    pictogram: Balon,
  },
  excl_consec: {
    label: "Exclusiones seguidas",
    color: "var(--goggle-red)",
    pictogram: Silbato,
  },
  train_consec: {
    label: "Entrenos seguidos",
    color: "var(--pool-teal)",
    pictogram: Balon,
  },
  mvp_consec: {
    label: "MVP seguidos",
    color: "var(--ball-gold)",
    pictogram: Trophy,
  },
  wins_consec: {
    label: "Victorias seguidas",
    color: "var(--pool-blue)",
    pictogram: Trophy,
  },
};

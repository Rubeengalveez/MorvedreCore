import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all-rows";
import { getSeasonCategoryYear } from "./seasons";
import { getSwimTimeEntries } from "./swim-times";
import {
  applyRankingAttendance,
  mergeRankingHistory,
  buildClubRankingStats,
  type ClubRankingStats,
  type RankingMatchInput,
  type RankingProfileInput,
  type RankingStatInput,
  type RankingTeamInput,
  type RankingsView,
} from "@/lib/domain/club-rankings";

export interface ClubRankingsData {
  season: { id: string; label: string };
  players: ClubRankingStats[];
  teams: ClubRankingStats[];
  playersByTeam: Record<string, ClubRankingStats[]>;
  swim: Awaited<ReturnType<typeof getSwimTimeEntries>>;
  actaCount: number;
  legacyCount: number;
  archivedSeasons: number;
}

export const getClubRankingsData = cache(
  async (
    season: { id: string; label: string },
    view: RankingsView,
    includeAttendance: boolean,
  ): Promise<ClubRankingsData> => {
    const supabase = await createClient();
    const [profiles, teams, rosters, matches, categoryYear, swim] = await Promise.all([
      readAllRows("los jugadores del club", (from, to) =>
        supabase
          .from("profiles_public")
          .select("id, full_name, photo_url, birth_year", { count: "exact" })
          .order("id")
          .range(from, to),
      ),
      readAllRows("los equipos", (from, to) =>
        supabase
          .from("teams")
          .select("id, label, color, category_code", { count: "exact" })
          .eq("season_id", season.id)
          .order("id")
          .range(from, to),
      ),
      readAllRows("las plantillas", (from, to) =>
        supabase
          .from("team_rosters")
          .select("player_id, team_id, joined_at, left_at, teams!inner(season_id)", {
            count: "exact",
          })
          .eq("teams.season_id", season.id)
          .order("team_id")
          .order("player_id")
          .range(from, to),
      ),
      readAllRows("los partidos finalizados", (from, to) =>
        supabase
          .from("matches")
          .select("id, team_id, status, scheduled_at, final_score_us, final_score_them", {
            count: "exact",
          })
          .eq("season_id", season.id)
          .eq("status", "played")
          .order("id")
          .range(from, to),
      ),
      getSeasonCategoryYear(season.id, supabase),
      getSwimTimeEntries(view === "legends" ? undefined : { seasonId: season.id }),
    ]);
    const sheets: Array<{ match_id: string; document: unknown }> = [];
    const stats: RankingStatInput[] = [];
    for (let start = 0; start < matches.length; start += 100) {
      const ids = matches.slice(start, start + 100).map((m) => m.id);
      const [documents, records] = await Promise.all([
        readAllRows("las actas", (from, to) =>
          supabase
            .from("live_match_sheets")
            .select("match_id, document", { count: "exact" })
            .in("match_id", ids)
            .order("match_id")
            .range(from, to),
        ),
        readAllRows("las estadísticas de los partidos", (from, to) =>
          supabase
            .from("match_stats")
            .select("match_id, player_id, goals, exclusions, mvp", { count: "exact" })
            .in("match_id", ids)
            .order("match_id")
            .order("player_id")
            .range(from, to),
        ),
      ]);
      sheets.push(...documents);
      stats.push(...records);
    }
    const input = {
      profiles: profiles as RankingProfileInput[],
      teams: teams as RankingTeamInput[],
      rosters: rosters.filter((r) => r.left_at == null),
      matches: matches as RankingMatchInput[],
      sheets,
      stats,
      categoryYear,
    };
    const result = buildClubRankingStats(input);
    const playersByTeam: Record<string, ClubRankingStats[]> = {};
    if (view !== "legends")
      for (const team of teams) {
        playersByTeam[team.id] = buildClubRankingStats({
          ...input,
          matches: input.matches.filter((match) => match.team_id === team.id),
        }).players;
      }
    if (includeAttendance) {
      const sessions = await readAllRows("los entrenamientos registrados", (from, to) =>
        supabase
          .from("training_sessions")
          .select("id, team_id, joint_id, player_ids, scheduled_at", { count: "exact" })
          .in(
            "team_id",
            teams.map((t) => t.id),
          )
          .eq("cancelled", false)
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .order("id")
          .range(from, to),
      );
      const entries: Array<{ session_id: string; player_id: string; present: boolean }> = [];
      for (let start = 0; start < sessions.length; start += 400) {
        const batches = [0, 100, 200, 300]
          .map((offset) => sessions.slice(start + offset, start + offset + 100))
          .filter((batch) => batch.length > 0);
        const results = await Promise.all(
          batches.map((batch) =>
            readAllRows("las listas de asistencia", (from, to) =>
              supabase
                .from("training_attendance")
                .select("session_id, player_id, present", { count: "exact" })
                .in(
                  "session_id",
                  batch.map((s) => s.id),
                )
                .order("session_id")
                .order("player_id")
                .range(from, to),
            ),
          ),
        );
        entries.push(...results.flat());
      }
      applyRankingAttendance(result.players, sessions, entries, rosters);
      for (const [teamId, players] of Object.entries(playersByTeam)) {
        const teamSessions = sessions.filter((session) => session.team_id === teamId);
        applyRankingAttendance(players, teamSessions, entries, rosters);
      }
    }
    let archivedSeasons = 0;
    if (view === "legends") {
      const history = await readAllRows("las temporadas archivadas", (from, to) =>
        supabase
          .from("historical_player_stats")
          .select(
            "profile_id, profile_name, season_id, category_code, matches_played, goals, exclusions, mvp_count, ranking_totals, trainings_attended, trainings_total",
            { count: "exact" },
          )
          .neq("season_id", season.id)
          .order("season_id")
          .order("profile_id")
          .range(from, to),
      );
      archivedSeasons = new Set(history.map((h) => h.season_id)).size;
      mergeRankingHistory(
        result.players,
        history.map((h) =>
          includeAttendance ? h : { ...h, trainings_attended: 0, trainings_total: 0 },
        ),
        profiles as RankingProfileInput[],
        categoryYear,
      );
    }
    return {
      season,
      players: result.players,
      teams: result.teams,
      playersByTeam: Object.fromEntries(
        Object.entries(playersByTeam).map(([id, players]) => [
          id,
          players.filter((p) => p.matches > 0 || p.trainings > 0),
        ]),
      ),
      swim,
      actaCount: result.actaCount,
      legacyCount: result.legacyCount,
      archivedSeasons,
    };
  },
);

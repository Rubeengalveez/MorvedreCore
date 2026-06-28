import { type CallupStatus } from "./callups";

export type MatchStatus = "scheduled" | "in_progress" | "played" | "cancelled" | "postponed";

export interface PlayerStats {
  player_id: string;
  season_id: string | null;
  matches_played: number;
  matches_called: number;
  goals: number;
  exclusions: number;
  mvp_count: number;
  attendance_pct: number;
  attendance_streak: number;
  trainings_attended: number;
  trainings_total: number;
}

export interface MatchLite {
  id: string;
  season_id: string;
  team_id: string;
  status: MatchStatus;
}

export interface CallupLite {
  match_id: string;
  player_id: string;
  status: CallupStatus;
}

export interface MatchStatLite {
  match_id: string;
  player_id: string;
  goals: number;
  exclusions: number;
  mvp: boolean;
}

export interface TrainingSessionLite {
  id: string;
  team_id: string;
  cancelled: boolean;
  scheduled_at: string;
}

export interface TrainingAttendanceLite {
  session_id: string;
  player_id: string;
  present: boolean;
}

const EFFECTIVE_CALLUP_STATUSES: ReadonlySet<CallupStatus> = new Set([
  "called",
  "confirmed",
  "no_show",
]);

function modeTeamId(teamIds: string[]): string | null {
  if (teamIds.length === 0) return null;
  const counts = new Map<string, number>();
  for (const id of teamIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = -1;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

export function computePlayerStats(
  playerId: string,
  seasonId: string,
  allSessions: TrainingSessionLite[],
  allAttendance: TrainingAttendanceLite[],
  allMatches: MatchLite[],
  allCallups: CallupLite[],
  allStats: MatchStatLite[],
): PlayerStats {
  const seasonMatchById = new Map<string, MatchLite>();
  const teamById = new Map<string, string>();
  for (const m of allMatches) {
    if (m.season_id === seasonId) {
      seasonMatchById.set(m.id, m);
      teamById.set(m.id, m.team_id);
    }
  }

  const playerCallups = allCallups.filter((c) => c.player_id === playerId);
  const playerSeasonCallups = playerCallups.filter((c) => seasonMatchById.has(c.match_id));

  const matches_played = playerSeasonCallups.filter(
    (c) =>
      seasonMatchById.get(c.match_id)?.status === "played" &&
      EFFECTIVE_CALLUP_STATUSES.has(c.status),
  ).length;

  const matches_called = playerSeasonCallups.length;

  const playerStats = allStats.filter(
    (s) => s.player_id === playerId && seasonMatchById.has(s.match_id),
  );
  const goals = playerStats.reduce((sum, s) => sum + s.goals, 0);
  const exclusions = playerStats.reduce((sum, s) => sum + s.exclusions, 0);
  const mvp_count = playerStats.filter((s) => s.mvp).length;

  const teamIds = playerSeasonCallups
    .map((c) => teamById.get(c.match_id))
    .filter((id): id is string => Boolean(id));
  const primaryTeamId = modeTeamId(teamIds);

  const playerTeamSessions = primaryTeamId
    ? allSessions.filter((s) => s.team_id === primaryTeamId && !s.cancelled)
    : [];
  const sessionIds = new Set(playerTeamSessions.map((s) => s.id));
  const playerAttendance = allAttendance.filter(
    (a) => a.player_id === playerId && sessionIds.has(a.session_id),
  );
  const trainings_attended = playerAttendance.filter((a) => a.present).length;
  const trainings_total = playerTeamSessions.length;
  const attendance_pct =
    trainings_total > 0 ? (trainings_attended / trainings_total) * 100 : 0;

  const sessionAttendanceById = new Map<string, boolean>();
  for (const a of playerAttendance) {
    sessionAttendanceById.set(a.session_id, a.present);
  }
  const orderedSessions = [...playerTeamSessions].sort((a, b) =>
    b.scheduled_at.localeCompare(a.scheduled_at),
  );
  let attendance_streak = 0;
  for (const s of orderedSessions) {
    if (sessionAttendanceById.get(s.id) !== true) break;
    attendance_streak += 1;
  }

  return {
    player_id: playerId,
    season_id: seasonId,
    matches_played,
    matches_called,
    goals,
    exclusions,
    mvp_count,
    attendance_pct,
    attendance_streak,
    trainings_attended,
    trainings_total,
  };
}

export interface SeasonAggregate {
  player_count: number;
  total_goals: number;
  total_exclusions: number;
  total_mvp: number;
  total_matches_played: number;
  total_matches_called: number;
  total_trainings_attended: number;
  total_trainings_total: number;
  avg_attendance_pct: number;
}

export function aggregateSeasonStats(playerStats: PlayerStats[]): SeasonAggregate {
  if (playerStats.length === 0) {
    return {
      player_count: 0,
      total_goals: 0,
      total_exclusions: 0,
      total_mvp: 0,
      total_matches_played: 0,
      total_matches_called: 0,
      total_trainings_attended: 0,
      total_trainings_total: 0,
      avg_attendance_pct: 0,
    };
  }

  const sums = playerStats.reduce(
    (acc, s) => {
      acc.goals += s.goals;
      acc.exclusions += s.exclusions;
      acc.mvp += s.mvp_count;
      acc.matches_played += s.matches_played;
      acc.matches_called += s.matches_called;
      acc.trainings_attended += s.trainings_attended;
      acc.trainings_total += s.trainings_total;
      acc.attendance_pct += s.attendance_pct;
      return acc;
    },
    {
      goals: 0,
      exclusions: 0,
      mvp: 0,
      matches_played: 0,
      matches_called: 0,
      trainings_attended: 0,
      trainings_total: 0,
      attendance_pct: 0,
    },
  );

  return {
    player_count: playerStats.length,
    total_goals: sums.goals,
    total_exclusions: sums.exclusions,
    total_mvp: sums.mvp,
    total_matches_played: sums.matches_played,
    total_matches_called: sums.matches_called,
    total_trainings_attended: sums.trainings_attended,
    total_trainings_total: sums.trainings_total,
    avg_attendance_pct: sums.attendance_pct / playerStats.length,
  };
}

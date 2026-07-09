import { describe, expect, it } from "vitest";
import {
  aggregateSeasonStats,
  computePlayerStats,
  type CallupLite,
  type MatchLite,
  type MatchStatLite,
  type TrainingAttendanceLite,
  type TrainingSessionLite,
} from "@/lib/domain/stats";

function match(overrides: Partial<MatchLite>): MatchLite {
  return {
    id: "m-1",
    season_id: "season-1",
    team_id: "team-1",
    status: "played",
    ...overrides,
  };
}

function callup(overrides: Partial<CallupLite>): CallupLite {
  return {
    match_id: "m-1",
    player_id: "p-1",
    status: "confirmed",
    ...overrides,
  };
}

function stat(overrides: Partial<MatchStatLite>): MatchStatLite {
  return {
    match_id: "m-1",
    player_id: "p-1",
    goals: 0,
    exclusions: 0,
    mvp: false,
    ...overrides,
  };
}

function session(overrides: Partial<TrainingSessionLite>): TrainingSessionLite {
  return {
    id: "s-1",
    team_id: "team-1",
    cancelled: false,
    scheduled_at: "2026-01-15T18:00:00Z",
    ...overrides,
  };
}

function attendance(overrides: Partial<TrainingAttendanceLite>): TrainingAttendanceLite {
  return {
    session_id: "s-1",
    player_id: "p-1",
    present: true,
    ...overrides,
  };
}

describe("computePlayerStats", () => {
  it("returns zeros for a player with no matches, no trainings, no stats", () => {
    const stats = computePlayerStats("p-1", "season-1", [], [], [], [], []);
    expect(stats).toEqual({
      player_id: "p-1",
      season_id: "season-1",
      matches_played: 0,
      matches_called: 0,
      goals: 0,
      exclusions: 0,
      mvp_count: 0,
      attendance_pct: 0,
      attendance_streak: 0,
      trainings_attended: 0,
      trainings_total: 0,
    });
  });

  it("aggregates goals, exclusions and mvp across multiple matches", () => {
    const matches: MatchLite[] = [
      match({ id: "m-1" }),
      match({ id: "m-2" }),
      match({ id: "m-3" }),
      match({ id: "m-4" }),
      match({ id: "m-5" }),
    ];
    const callups: CallupLite[] = matches.map((m, i) =>
      callup({ match_id: m.id, status: i === 0 ? "called" : "confirmed" }),
    );
    const stats: MatchStatLite[] = [
      stat({ match_id: "m-1", goals: 2 }),
      stat({ match_id: "m-2", goals: 1, exclusions: 1 }),
      stat({ match_id: "m-3", mvp: true }),
      stat({ match_id: "m-4" }),
      stat({ match_id: "m-5" }),
    ];
    const result = computePlayerStats("p-1", "season-1", [], [], matches, callups, stats);
    expect(result.matches_played).toBe(5);
    expect(result.matches_called).toBe(5);
    expect(result.goals).toBe(3);
    expect(result.exclusions).toBe(1);
    expect(result.mvp_count).toBe(1);
  });

  it("computes attendance_pct as attended / total * 100", () => {
    const sessions: TrainingSessionLite[] = Array.from({ length: 10 }, (_, i) =>
      session({ id: `s-${i}` }),
    );
    const attendanceRows: TrainingAttendanceLite[] = [
      ...Array.from({ length: 8 }, (_, i) => attendance({ session_id: `s-${i}`, present: true })),
      ...Array.from({ length: 2 }, (_, i) =>
        attendance({ session_id: `s-${i + 8}`, present: false }),
      ),
    ];
    const matches = [match({ id: "m-1", team_id: "team-1" })];
    const callups = [callup({ match_id: "m-1" })];
    const result = computePlayerStats(
      "p-1",
      "season-1",
      sessions,
      attendanceRows,
      matches,
      callups,
      [],
    );
    expect(result.trainings_total).toBe(10);
    expect(result.trainings_attended).toBe(8);
    expect(result.attendance_pct).toBe(80);
  });

  it("only counts matches in the given season", () => {
    const matches: MatchLite[] = [
      match({ id: "m-1", season_id: "season-1" }),
      match({ id: "m-2", season_id: "season-2" }),
    ];
    const callups: CallupLite[] = [callup({ match_id: "m-1" }), callup({ match_id: "m-2" })];
    const result = computePlayerStats("p-1", "season-1", [], [], matches, callups, []);
    expect(result.matches_played).toBe(1);
    expect(result.matches_called).toBe(1);
  });

  it("only counts trainings of the player's team", () => {
    const sessions: TrainingSessionLite[] = [
      ...Array.from({ length: 10 }, (_, i) => session({ id: `s-own-${i}`, team_id: "team-1" })),
      ...Array.from({ length: 5 }, (_, i) => session({ id: `s-other-${i}`, team_id: "team-2" })),
    ];
    const attendanceRows: TrainingAttendanceLite[] = [
      ...Array.from({ length: 8 }, (_, i) =>
        attendance({ session_id: `s-own-${i}`, present: true }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        attendance({ session_id: `s-other-${i}`, present: true }),
      ),
    ];
    const matches = [match({ id: "m-1", team_id: "team-1" })];
    const callups = [callup({ match_id: "m-1" })];
    const result = computePlayerStats(
      "p-1",
      "season-1",
      sessions,
      attendanceRows,
      matches,
      callups,
      [],
    );
    expect(result.trainings_total).toBe(10);
    expect(result.trainings_attended).toBe(8);
    expect(result.attendance_pct).toBe(80);
  });

  it("excludes cancelled sessions from the total", () => {
    const sessions: TrainingSessionLite[] = [
      session({ id: "s-1" }),
      session({ id: "s-2", cancelled: true }),
      session({ id: "s-3" }),
    ];
    const attendanceRows: TrainingAttendanceLite[] = [
      attendance({ session_id: "s-1", present: true }),
      attendance({ session_id: "s-2", present: true }),
      attendance({ session_id: "s-3", present: false }),
    ];
    const matches = [match({ id: "m-1", team_id: "team-1" })];
    const callups = [callup({ match_id: "m-1" })];
    const result = computePlayerStats(
      "p-1",
      "season-1",
      sessions,
      attendanceRows,
      matches,
      callups,
      [],
    );
    expect(result.trainings_total).toBe(2);
    expect(result.trainings_attended).toBe(1);
    expect(result.attendance_pct).toBe(50);
  });

  it("counts a callup toward matches_played only when the match is played and the callup is effective", () => {
    const matches: MatchLite[] = [
      match({ id: "m-1", status: "played" }),
      match({ id: "m-2", status: "played" }),
      match({ id: "m-3", status: "scheduled" }),
    ];
    const callups: CallupLite[] = [
      callup({ match_id: "m-1", status: "confirmed" }),
      callup({ match_id: "m-2", status: "declined" }),
      callup({ match_id: "m-3", status: "called" }),
    ];
    const result = computePlayerStats("p-1", "season-1", [], [], matches, callups, []);
    expect(result.matches_played).toBe(1);
    expect(result.matches_called).toBe(3);
  });
});

describe("aggregateSeasonStats", () => {
  it("sums fields across all players", () => {
    const aggregate = aggregateSeasonStats([
      {
        player_id: "p-1",
        season_id: "s-1",
        matches_played: 5,
        matches_called: 6,
        goals: 10,
        exclusions: 1,
        mvp_count: 1,
        attendance_pct: 80,
        attendance_streak: 0,
        trainings_attended: 8,
        trainings_total: 10,
      },
      {
        player_id: "p-2",
        season_id: "s-1",
        matches_played: 4,
        matches_called: 5,
        goals: 7,
        exclusions: 2,
        mvp_count: 0,
        attendance_pct: 60,
        attendance_streak: 0,
        trainings_attended: 6,
        trainings_total: 10,
      },
    ]);
    expect(aggregate.player_count).toBe(2);
    expect(aggregate.total_goals).toBe(17);
    expect(aggregate.total_exclusions).toBe(3);
    expect(aggregate.total_mvp).toBe(1);
    expect(aggregate.total_matches_played).toBe(9);
    expect(aggregate.total_matches_called).toBe(11);
    expect(aggregate.total_trainings_attended).toBe(14);
    expect(aggregate.total_trainings_total).toBe(20);
    expect(aggregate.avg_attendance_pct).toBe(70);
  });

  it("returns zeros for an empty list", () => {
    expect(aggregateSeasonStats([])).toEqual({
      player_count: 0,
      total_goals: 0,
      total_exclusions: 0,
      total_mvp: 0,
      total_matches_played: 0,
      total_matches_called: 0,
      total_trainings_attended: 0,
      total_trainings_total: 0,
      avg_attendance_pct: 0,
    });
  });
});

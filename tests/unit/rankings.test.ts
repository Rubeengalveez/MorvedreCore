import { describe, expect, it } from "vitest";

import {
  computeAttendanceStreak,
  computeOpponentHistory,
  computeRanking,
  findMyPosition,
  isMyPositionOutsideTopN,
  opponentVerdict,
  paginateRanking,
  RANKINGS_PAGE_SIZE,
  type PlayerStatsInput,
  type RankingMetric,
} from "@/lib/domain/rankings";

function makePlayer(overrides: Partial<PlayerStatsInput>): PlayerStatsInput {
  return {
    player_id: "p-1",
    full_name: "Jugador Uno",
    photo_url: null,
    cap_number: 1,
    category_code: "cadete",
    team_id: "team-1",
    team_label: "Cadete A",
    team_color: "#1E5AA8",
    matches_played: 0,
    goals: 0,
    exclusions: 0,
    mvp_count: 0,
    trainings_attended: 0,
    trainings_total: 0,
    attendance_pct: 0,
    attendance_streak: 0,
    ...overrides,
  };
}

describe("computeRanking", () => {
  it("returns an empty array when no players are provided", () => {
    const result = computeRanking([], { metric: "goals", scope: { kind: "all" } });
    expect(result).toEqual([]);
  });

  it("sorts by goals descending and assigns positions 1,2,3,4", () => {
    const players = [
      makePlayer({ player_id: "p-1", full_name: "Ana", goals: 5 }),
      makePlayer({ player_id: "p-2", full_name: "Bea", goals: 12 }),
      makePlayer({ player_id: "p-3", full_name: "Cris", goals: 8 }),
      makePlayer({ player_id: "p-4", full_name: "Dora", goals: 3 }),
    ];
    const result = computeRanking(players, { metric: "goals", scope: { kind: "all" } });
    expect(result.map((r) => r.player_id)).toEqual(["p-2", "p-3", "p-1", "p-4"]);
    expect(result.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    expect(result[0]?.medal).toBe("gold");
    expect(result[1]?.medal).toBe("silver");
    expect(result[2]?.medal).toBe("bronze");
    expect(result[3]?.medal).toBeNull();
  });

  it("uses the same position for ties (1,1,3) and medals follow position", () => {
    const players = [
      makePlayer({ player_id: "p-1", full_name: "Ana", goals: 7 }),
      makePlayer({ player_id: "p-2", full_name: "Bea", goals: 7 }),
      makePlayer({ player_id: "p-3", full_name: "Cris", goals: 4 }),
    ];
    const result = computeRanking(players, { metric: "goals", scope: { kind: "all" } });
    expect(result.map((r) => r.position)).toEqual([1, 1, 3]);
    expect(result[0]?.medal).toBe("gold");
    expect(result[1]?.medal).toBe("gold");
    expect(result[2]?.medal).toBe("bronze");
  });

  it("breaks ties by cap_number then full_name", () => {
    const players = [
      makePlayer({ player_id: "p-1", full_name: "Bea", goals: 5, cap_number: 7 }),
      makePlayer({ player_id: "p-2", full_name: "Ana", goals: 5, cap_number: 3 }),
      makePlayer({ player_id: "p-3", full_name: "Cris", goals: 5, cap_number: 3 }),
    ];
    const result = computeRanking(players, { metric: "goals", scope: { kind: "all" } });
    expect(result.map((r) => r.player_id)).toEqual(["p-2", "p-3", "p-1"]);
  });

  it("filters by category scope", () => {
    const players = [
      makePlayer({ player_id: "p-1", category_code: "cadete", goals: 10 }),
      makePlayer({ player_id: "p-2", category_code: "juvenil", goals: 12 }),
      makePlayer({ player_id: "p-3", category_code: "cadete", goals: 6 }),
    ];
    const result = computeRanking(players, {
      metric: "goals",
      scope: { kind: "category", category_code: "cadete" },
    });
    expect(result.map((r) => r.player_id)).toEqual(["p-1", "p-3"]);
  });

  it("filters by team scope", () => {
    const players = [
      makePlayer({ player_id: "p-1", team_id: "team-a", goals: 8 }),
      makePlayer({ player_id: "p-2", team_id: "team-b", goals: 12 }),
      makePlayer({ player_id: "p-3", team_id: "team-a", goals: 4 }),
    ];
    const result = computeRanking(players, {
      metric: "goals",
      scope: { kind: "team", team_id: "team-a" },
    });
    expect(result.map((r) => r.player_id)).toEqual(["p-1", "p-3"]);
  });

  it("applies min_trainings_total filter", () => {
    const players = [
      makePlayer({ player_id: "p-1", goals: 10, trainings_total: 2 }),
      makePlayer({ player_id: "p-2", goals: 7, trainings_total: 10 }),
      makePlayer({ player_id: "p-3", goals: 4, trainings_total: 5 }),
    ];
    const result = computeRanking(players, {
      metric: "goals",
      scope: { kind: "all" },
      min_trainings_total: 5,
    });
    expect(result.map((r) => r.player_id)).toEqual(["p-2", "p-3"]);
  });

  it("sorts exclusions descending (higher is first)", () => {
    const players = [
      makePlayer({ player_id: "p-1", exclusions: 5 }),
      makePlayer({ player_id: "p-2", exclusions: 1 }),
      makePlayer({ player_id: "p-3", exclusions: 3 }),
    ];
    const result = computeRanking(players, {
      metric: "exclusions",
      scope: { kind: "all" },
    });
    expect(result.map((r) => r.player_id)).toEqual(["p-1", "p-3", "p-2"]);
  });

  it("respects top_n when provided", () => {
    const players = [
      makePlayer({ player_id: "p-1", goals: 10 }),
      makePlayer({ player_id: "p-2", goals: 8 }),
      makePlayer({ player_id: "p-3", goals: 6 }),
      makePlayer({ player_id: "p-4", goals: 4 }),
    ];
    const result = computeRanking(players, {
      metric: "goals",
      scope: { kind: "all" },
      top_n: 2,
    });
    expect(result.map((r) => r.player_id)).toEqual(["p-1", "p-2"]);
  });

  it.each([
    ["goals", "goals"],
    ["exclusions", "exclusions"],
    ["mvp", "mvp_count"],
    ["attendance", "attendance_pct"],
    ["streak", "attendance_streak"],
  ] as Array<[RankingMetric, keyof PlayerStatsInput]>)(
    "uses %s as the primary sort key",
    (metric, key) => {
      const players = [
        makePlayer({ player_id: "p-1", [key]: 1 } as Partial<PlayerStatsInput>),
        makePlayer({ player_id: "p-2", [key]: 2 } as Partial<PlayerStatsInput>),
        makePlayer({ player_id: "p-3", [key]: 3 } as Partial<PlayerStatsInput>),
      ];
      const result = computeRanking(players, { metric, scope: { kind: "all" } });
      expect(result.map((r) => r.player_id)).toEqual(["p-3", "p-2", "p-1"]);
    },
  );
});

describe("findMyPosition", () => {
  it("returns null when the player is not in the ranking", () => {
    const ranking = computeRanking([makePlayer({ player_id: "p-1", goals: 5 })], {
      metric: "goals",
      scope: { kind: "all" },
    });
    expect(findMyPosition(ranking, "nope")).toBeNull();
  });

  it("returns delta_to_next (gap to the player above) and delta_to_prev (lead over the player below) for a mid-table player", () => {
    const ranking = computeRanking(
      [
        makePlayer({ player_id: "p-1", goals: 12 }),
        makePlayer({ player_id: "p-2", goals: 8 }),
        makePlayer({ player_id: "p-3", goals: 5 }),
        makePlayer({ player_id: "p-4", goals: 2 }),
      ],
      { metric: "goals", scope: { kind: "all" } },
    );
    const info = findMyPosition(ranking, "p-3");
    expect(info).not.toBeNull();
    expect(info?.row.position).toBe(3);
    expect(info?.delta_to_next).toBe(3);
    expect(info?.delta_to_prev).toBe(3);
  });

  it("returns null delta_to_next for the leader", () => {
    const ranking = computeRanking(
      [makePlayer({ player_id: "p-1", goals: 10 }), makePlayer({ player_id: "p-2", goals: 5 })],
      { metric: "goals", scope: { kind: "all" } },
    );
    const info = findMyPosition(ranking, "p-1");
    expect(info?.delta_to_next).toBeNull();
    expect(info?.delta_to_prev).toBe(5);
  });

  it("returns null delta_to_prev for the last player", () => {
    const ranking = computeRanking(
      [makePlayer({ player_id: "p-1", goals: 10 }), makePlayer({ player_id: "p-2", goals: 5 })],
      { metric: "goals", scope: { kind: "all" } },
    );
    const info = findMyPosition(ranking, "p-2");
    expect(info?.delta_to_next).toBe(5);
    expect(info?.delta_to_prev).toBeNull();
  });
});

describe("computeAttendanceStreak", () => {
  const sessions = [
    { id: "s-1", scheduled_at: "2026-01-10T18:00:00Z", cancelled: false },
    { id: "s-2", scheduled_at: "2026-01-08T18:00:00Z", cancelled: false },
    { id: "s-3", scheduled_at: "2026-01-06T18:00:00Z", cancelled: false },
    { id: "s-4", scheduled_at: "2026-01-04T18:00:00Z", cancelled: false },
  ];

  it("returns 0 when the player has missed the most recent session", () => {
    const result = computeAttendanceStreak(sessions, [
      { session_id: "s-1", present: false },
      { session_id: "s-2", present: true },
      { session_id: "s-3", present: true },
    ]);
    expect(result).toBe(0);
  });

  it("counts consecutive attended sessions from the most recent", () => {
    const result = computeAttendanceStreak(sessions, [
      { session_id: "s-1", present: true },
      { session_id: "s-2", present: true },
      { session_id: "s-3", present: true },
      { session_id: "s-4", present: false },
    ]);
    expect(result).toBe(3);
  });

  it("ignores cancelled sessions", () => {
    const result = computeAttendanceStreak(
      [
        { id: "s-1", scheduled_at: "2026-01-10T18:00:00Z", cancelled: true },
        { id: "s-2", scheduled_at: "2026-01-08T18:00:00Z", cancelled: false },
      ],
      [
        { session_id: "s-1", present: true },
        { session_id: "s-2", present: true },
      ],
    );
    expect(result).toBe(1);
  });

  it("stops at the first absent session", () => {
    const result = computeAttendanceStreak(
      [
        { id: "s-1", scheduled_at: "2026-01-10T18:00:00Z", cancelled: false },
        { id: "s-2", scheduled_at: "2026-01-08T18:00:00Z", cancelled: false },
        { id: "s-3", scheduled_at: "2026-01-06T18:00:00Z", cancelled: false },
      ],
      [
        { session_id: "s-1", present: true },
        { session_id: "s-2", present: false },
        { session_id: "s-3", present: true },
      ],
    );
    expect(result).toBe(1);
  });

  it("returns 0 for a player without attendance rows", () => {
    expect(computeAttendanceStreak(sessions, [])).toBe(0);
  });

  it("handles out-of-order input by sorting internally", () => {
    const result = computeAttendanceStreak(
      [
        { id: "s-2", scheduled_at: "2026-01-08T18:00:00Z", cancelled: false },
        { id: "s-1", scheduled_at: "2026-01-10T18:00:00Z", cancelled: false },
        { id: "s-3", scheduled_at: "2026-01-06T18:00:00Z", cancelled: false },
      ],
      [
        { session_id: "s-1", present: true },
        { session_id: "s-2", present: true },
        { session_id: "s-3", present: true },
      ],
    );
    expect(result).toBe(3);
  });
});

describe("computeOpponentHistory", () => {
  const rows = [
    {
      opponent: "Elche",
      category_code: "cadete",
      team_id: "team-1",
      team_label: "Cadete A",
      matches_played: 4,
      wins: 1,
      draws: 0,
      losses: 3,
      goals_for: 12,
      goals_against: 18,
      last_match_at: "2025-12-01T00:00:00Z",
    },
    {
      opponent: "Valencia",
      category_code: "cadete",
      team_id: "team-1",
      team_label: "Cadete A",
      matches_played: 6,
      wins: 4,
      draws: 1,
      losses: 1,
      goals_for: 24,
      goals_against: 14,
      last_match_at: "2026-02-15T00:00:00Z",
    },
    {
      opponent: "Castellon",
      category_code: "cadete",
      team_id: "team-1",
      team_label: "Cadete A",
      matches_played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goals_for: 6,
      goals_against: 7,
      last_match_at: "2025-10-10T00:00:00Z",
    },
  ];

  it("enriches each row with win_pct (rounded) and goal_diff", () => {
    const result = computeOpponentHistory(rows, "last_match_desc");
    const elche = result.find((r) => r.opponent === "Elche");
    const valencia = result.find((r) => r.opponent === "Valencia");
    expect(elche?.win_pct).toBe(25);
    expect(elche?.goal_diff).toBe(-6);
    expect(valencia?.win_pct).toBe(66.67);
    expect(valencia?.goal_diff).toBe(10);
  });

  it("sorts by last_match_desc by default", () => {
    const result = computeOpponentHistory(rows, "last_match_desc");
    expect(result.map((r) => r.opponent)).toEqual(["Valencia", "Elche", "Castellon"]);
  });

  it("sorts by matches_played desc when requested", () => {
    const result = computeOpponentHistory(rows, "matches_desc");
    expect(result.map((r) => r.opponent)).toEqual(["Valencia", "Elche", "Castellon"]);
  });

  it("sorts by win_pct desc when requested", () => {
    const result = computeOpponentHistory(rows, "win_pct_desc");
    expect(result.map((r) => r.opponent)).toEqual(["Valencia", "Castellon", "Elche"]);
  });

  it("sorts by goal_diff desc when requested", () => {
    const result = computeOpponentHistory(rows, "goal_diff_desc");
    expect(result.map((r) => r.opponent)).toEqual(["Valencia", "Castellon", "Elche"]);
  });

  it("returns an empty array when no rows are provided", () => {
    expect(computeOpponentHistory([])).toEqual([]);
  });
});

describe("opponentVerdict", () => {
  it("returns muted 'Sin historial' when no matches have been played", () => {
    expect(opponentVerdict({ matches_played: 0, win_pct: 0 })).toEqual({
      label: "Sin historial",
      tone: "muted",
    });
  });

  it("returns success when win_pct is 60 or higher", () => {
    expect(opponentVerdict({ matches_played: 5, win_pct: 60 })).toEqual({
      label: "Victima preferida",
      tone: "success",
    });
    expect(opponentVerdict({ matches_played: 5, win_pct: 100 })).toEqual({
      label: "Victima preferida",
      tone: "success",
    });
  });

  it("returns danger when win_pct is 40 or lower", () => {
    expect(opponentVerdict({ matches_played: 5, win_pct: 40 })).toEqual({
      label: "Bestia negra",
      tone: "danger",
    });
    expect(opponentVerdict({ matches_played: 5, win_pct: 0 })).toEqual({
      label: "Bestia negra",
      tone: "danger",
    });
  });

  it("returns muted 'Equilibrado' between 40 and 60", () => {
    expect(opponentVerdict({ matches_played: 5, win_pct: 50 })).toEqual({
      label: "Equilibrado",
      tone: "muted",
    });
    expect(opponentVerdict({ matches_played: 5, win_pct: 41 })).toEqual({
      label: "Equilibrado",
      tone: "muted",
    });
  });
});

describe("paginateRanking", () => {
  const players: PlayerStatsInput[] = Array.from({ length: 25 }, (_, i) =>
    makePlayer({ player_id: `p-${i}`, full_name: `Jugador ${i}`, goals: 25 - i }),
  );
  const ranking = computeRanking(players, { metric: "goals", scope: { kind: "all" } });

  it("uses a 10-row page size by default", () => {
    expect(RANKINGS_PAGE_SIZE).toBe(10);
  });

  it("returns 10 rows on the first page", () => {
    const page = paginateRanking({ ranking, page: 1 });
    expect(page.rows).toHaveLength(10);
    expect(page.page).toBe(1);
    expect(page.total_pages).toBe(3);
    expect(page.total_players).toBe(25);
  });

  it("returns the last page with the remaining rows", () => {
    const page = paginateRanking({ ranking, page: 3 });
    expect(page.rows).toHaveLength(5);
    expect(page.rows[0]?.player_id).toBe("p-20");
  });

  it("clamps page out of range to the last page", () => {
    const page = paginateRanking({ ranking, page: 99 });
    expect(page.page).toBe(3);
    expect(page.rows).toHaveLength(5);
  });

  it("clamps negative pages to 1", () => {
    const page = paginateRanking({ ranking, page: 0 });
    expect(page.page).toBe(1);
  });

  it("returns a single empty page when ranking is empty", () => {
    const page = paginateRanking({ ranking: [], page: 1 });
    expect(page.rows).toHaveLength(0);
    expect(page.total_pages).toBe(1);
    expect(page.page).toBe(1);
  });
});

describe("isMyPositionOutsideTopN", () => {
  const players: PlayerStatsInput[] = Array.from({ length: 15 }, (_, i) =>
    makePlayer({ player_id: `p-${i}`, full_name: `Jugador ${i}`, goals: 15 - i }),
  );
  const ranking = computeRanking(players, { metric: "goals", scope: { kind: "all" } });

  it("returns true when player is outside the top N", () => {
    expect(isMyPositionOutsideTopN(ranking, "p-12", 10)).toBe(true);
  });

  it("returns false when player is inside the top N", () => {
    expect(isMyPositionOutsideTopN(ranking, "p-3", 10)).toBe(false);
  });

  it("returns false when player is not in the ranking", () => {
    expect(isMyPositionOutsideTopN(ranking, "missing", 10)).toBe(false);
  });

  it("returns false when playerId is null", () => {
    expect(isMyPositionOutsideTopN(ranking, null, 10)).toBe(false);
  });
});

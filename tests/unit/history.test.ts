import { describe, expect, it } from "vitest";

import { computeLegends, type LegendStatInput } from "@/lib/domain/history";

function stat(overrides: Partial<LegendStatInput>): LegendStatInput {
  return {
    profile_id: "player-1",
    profile_name: "Alex Morvedre",
    photo_url: null,
    season_id: "season-1",
    matches_played: 0,
    matches_called: 0,
    goals: 0,
    exclusions: 0,
    trainings_attended: 0,
    trainings_total: 0,
    mvp_count: 0,
    ...overrides,
  };
}

describe("computeLegends", () => {
  it("adds the same player's totals across seasons", () => {
    const result = computeLegends(
      [
        stat({ season_id: "25-26", goals: 12, matches_played: 8 }),
        stat({ season_id: "26-27", goals: 9, matches_played: 7 }),
      ],
      "goals",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ goals: 21, matches_played: 15, seasons: 2, rank: 1 });
  });

  it("weights attendance by the number of sessions instead of averaging percentages", () => {
    const result = computeLegends(
      [
        stat({ season_id: "25-26", trainings_attended: 1, trainings_total: 1 }),
        stat({ season_id: "26-27", trainings_attended: 1, trainings_total: 9 }),
      ],
      "attendance_pct",
    );

    expect(result[0]?.attendance_pct).toBe(20);
  });

  it("uses competition ranking for ties", () => {
    const result = computeLegends(
      [
        stat({ profile_id: "a", profile_name: "A", goals: 5 }),
        stat({ profile_id: "b", profile_name: "B", goals: 5 }),
        stat({ profile_id: "c", profile_name: "C", goals: 3 }),
      ],
      "goals",
    );

    expect(result.map((row) => row.rank)).toEqual([1, 1, 3]);
  });

  it("omits players without data for the selected metric", () => {
    expect(computeLegends([stat({ goals: 0 })], "goals")).toEqual([]);
  });
});

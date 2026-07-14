import { describe, expect, it } from "vitest";
import {
  canCallUpTo,
  defaultCapForPlayer,
  findConflicts,
  getBRuleTeamsForCategory,
  isPlayerBRuleBlocked,
  suggestCallup,
  type AvailabilityRow,
  type PlayerForCallup,
  type TeamForCallup,
} from "@/lib/domain/callups";

const CADETE_A: TeamForCallup = { id: "team-cadete-a", category_code: "cadete", label: "Cadete A" };
const CADETE_B: TeamForCallup = { id: "team-cadete-b", category_code: "cadete", label: "Cadete B" };
const INFANTIL_A: TeamForCallup = {
  id: "team-infantil-a",
  category_code: "infantil",
  label: "Infantil A",
};
const JUVENIL_UNICO: TeamForCallup = {
  id: "team-juvenil",
  category_code: "juvenil",
  label: "Juvenil único",
};
const ESCUELA: TeamForCallup = { id: "team-escuela", category_code: "escuela", label: "Escuela" };

function player(overrides: Partial<PlayerForCallup>): PlayerForCallup {
  return {
    id: "p-1",
    full_name: "Jugador Uno",
    category_code: "cadete",
    cap_number: 5,
    current_team_id: "team-cadete-a",
    ...overrides,
  };
}

describe("canCallUpTo", () => {
  it("allows benjamin → alevin (N+1)", () => {
    expect(canCallUpTo("benjamin", "alevin", 2026)).toBe(true);
  });

  it("rejects benjamin → cadete (N+3)", () => {
    expect(canCallUpTo("benjamin", "cadete", 2026)).toBe(false);
  });

  it("allows cadete → benjamin (any drop-down)", () => {
    expect(canCallUpTo("cadete", "benjamin", 2026)).toBe(true);
  });

  it("allows cadete → juvenil (N+1)", () => {
    expect(canCallUpTo("cadete", "juvenil", 2026)).toBe(true);
  });

  it("rejects cadete → absoluto (N+2)", () => {
    expect(canCallUpTo("cadete", "absoluto", 2026)).toBe(false);
  });

  it("allows alevin → infantil (N+1)", () => {
    expect(canCallUpTo("alevin", "infantil", 2026)).toBe(true);
  });

  it("rejects alevin → cadete (N+2)", () => {
    expect(canCallUpTo("alevin", "cadete", 2026)).toBe(false);
  });

  it("allows alevin → benjamin (drop-down)", () => {
    expect(canCallUpTo("alevin", "benjamin", 2026)).toBe(true);
  });

  it("always allows escuela team to take any player", () => {
    expect(canCallUpTo("cadete", "escuela", 2026)).toBe(true);
    expect(canCallUpTo("juvenil", "escuela", 2026)).toBe(true);
  });

  it("always allows an escuela player to join any team", () => {
    expect(canCallUpTo("escuela", "cadete", 2026)).toBe(true);
    expect(canCallUpTo("escuela", "benjamin", 2026)).toBe(true);
  });
});

describe("getBRuleTeamsForCategory", () => {
  it("returns null/null when a category has only one team", () => {
    const result = getBRuleTeamsForCategory([JUVENIL_UNICO], "juvenil");
    expect(result.teamA).toBeNull();
    expect(result.teamB).toBeNull();
  });

  it("returns null/null when no team matches the category", () => {
    const result = getBRuleTeamsForCategory([CADETE_A], "infantil");
    expect(result.teamA).toBeNull();
    expect(result.teamB).toBeNull();
  });

  it("identifies the A and B teams by label suffix", () => {
    const result = getBRuleTeamsForCategory([CADETE_A, CADETE_B, INFANTIL_A], "cadete");
    expect(result.teamA?.id).toBe("team-cadete-a");
    expect(result.teamB?.id).toBe("team-cadete-b");
  });

  it("returns null/null when labels lack an A/B suffix (B rule does not apply)", () => {
    const team1: TeamForCallup = { id: "t1", category_code: "infantil", label: "Infantil 1" };
    const team2: TeamForCallup = { id: "t2", category_code: "infantil", label: "Infantil 2" };
    const result = getBRuleTeamsForCategory([team1, team2], "infantil");
    expect(result.teamA).toBeNull();
    expect(result.teamB).toBeNull();
  });
});

describe("isPlayerBRuleBlocked", () => {
  const allTeams = [CADETE_A, CADETE_B, INFANTIL_A];

  it("blocks a player in B from being called up to A", () => {
    expect(isPlayerBRuleBlocked("p-1", CADETE_B.id, CADETE_A.id, allTeams)).toBe(true);
  });

  it("blocks a player in A from being called up to B", () => {
    expect(isPlayerBRuleBlocked("p-1", CADETE_A.id, CADETE_B.id, allTeams)).toBe(true);
  });

  it("does not block a player in A when target is A", () => {
    expect(isPlayerBRuleBlocked("p-1", CADETE_A.id, CADETE_A.id, allTeams)).toBe(false);
  });

  it("does not block a player in B when target is B", () => {
    expect(isPlayerBRuleBlocked("p-1", CADETE_B.id, CADETE_B.id, allTeams)).toBe(false);
  });

  it("does not block when teams are in different categories", () => {
    expect(isPlayerBRuleBlocked("p-1", INFANTIL_A.id, CADETE_A.id, allTeams)).toBe(false);
  });

  it("does not block when the target team does not exist", () => {
    expect(isPlayerBRuleBlocked("p-1", CADETE_A.id, "missing", allTeams)).toBe(false);
  });

  it("does not block when the player's team does not exist", () => {
    expect(isPlayerBRuleBlocked("p-1", "missing", CADETE_A.id, allTeams)).toBe(false);
  });
});

describe("findConflicts", () => {
  const availability: AvailabilityRow[] = [
    { player_id: "p-1", date: "2026-10-10", available: false, reason: "examen" },
    { player_id: "p-1", date: "2026-10-11", available: true, reason: null },
  ];

  it("returns false when the player has no availability record", () => {
    expect(findConflicts("p-2", "2026-10-10", availability)).toBe(false);
  });

  it("returns false when the player is available", () => {
    expect(findConflicts("p-1", "2026-10-11", availability)).toBe(false);
  });

  it("returns true when the player marked themselves unavailable for that day", () => {
    expect(findConflicts("p-1", "2026-10-10", availability)).toBe(true);
  });

  it("accepts Date objects and uses local date for comparison", () => {
    expect(findConflicts("p-1", new Date(2026, 9, 10), availability)).toBe(true);
  });
});

describe("suggestCallup", () => {
  const allTeams = [CADETE_A, CADETE_B, INFANTIL_A, JUVENIL_UNICO, ESCUELA];

  it("includes every player in the target team as starter candidates", () => {
    const ownPlayers = [
      player({
        id: "p-1",
        full_name: "Ana",
        category_code: "cadete",
        cap_number: 4,
        current_team_id: CADETE_A.id,
      }),
      player({
        id: "p-2",
        full_name: "Bea",
        category_code: "cadete",
        cap_number: 7,
        current_team_id: CADETE_A.id,
      }),
    ];
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: ownPlayers,
      allAvailability: [],
    });
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((s) => !s.is_substitute)).toBe(true);
    expect(suggestions[0]!.player_id).toBe("p-1");
    expect(suggestions[1]!.player_id).toBe("p-2");
  });

  it("blocks Cadete B players when target is Cadete A (B rule)", () => {
    const players = [
      player({ id: "p-1", full_name: "Ana", current_team_id: CADETE_A.id }),
      player({ id: "p-2", full_name: "Bea", current_team_id: CADETE_B.id }),
    ];
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: players,
      allAvailability: [],
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.player_id).toBe("p-1");
  });

  it("includes players from lower categories (ascending)", () => {
    const players = [
      player({
        id: "p-1",
        full_name: "Ana",
        category_code: "cadete",
        cap_number: 1,
        current_team_id: CADETE_A.id,
      }),
      player({
        id: "p-2",
        full_name: "Bea",
        category_code: "infantil",
        cap_number: 9,
        current_team_id: INFANTIL_A.id,
      }),
    ];
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: players,
      allAvailability: [],
    });
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]!.player_id).toBe("p-1");
    expect(suggestions[1]!.player_id).toBe("p-2");
    expect(suggestions[1]!.is_ascending).toBe(true);
    expect(suggestions[1]!.source_team_id).toBe(INFANTIL_A.id);
  });

  it("marks players with availability conflicts", () => {
    const players = [player({ id: "p-1", full_name: "Ana", current_team_id: CADETE_A.id })];
    const availability: AvailabilityRow[] = [
      { player_id: "p-1", date: "2026-10-10", available: false, reason: "Médico" },
    ];
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: players,
      allAvailability: availability,
    });
    expect(suggestions[0]!.has_conflict).toBe(true);
  });

  it("flags players beyond max as substitutes", () => {
    const ownPlayers = Array.from({ length: 15 }, (_, i) =>
      player({
        id: `p-${i}`,
        full_name: `Player ${i}`,
        cap_number: i + 1,
        current_team_id: CADETE_A.id,
      }),
    );
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: ownPlayers,
      allAvailability: [],
      max: 13,
    });
    const starters = suggestions.filter((s) => !s.is_substitute);
    const substitutes = suggestions.filter((s) => s.is_substitute);
    expect(starters).toHaveLength(13);
    expect(substitutes).toHaveLength(2);
  });

  it("respects a custom max", () => {
    const ownPlayers = Array.from({ length: 4 }, (_, i) =>
      player({ id: `p-${i}`, full_name: `P${i}`, cap_number: i + 1, current_team_id: CADETE_A.id }),
    );
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: ownPlayers,
      allAvailability: [],
      max: 2,
    });
    expect(suggestions.filter((s) => !s.is_substitute)).toHaveLength(2);
    expect(suggestions.filter((s) => s.is_substitute)).toHaveLength(2);
  });

  it("prioritizes previous callup, goals, age, attendance and fewer exclusions in that order", () => {
    const orderedPlayers = [
      player({
        id: "previous",
        full_name: "Anterior",
        current_team_id: CADETE_A.id,
        was_previous_callup: true,
      }),
      player({
        id: "goals",
        full_name: "Goles",
        current_team_id: CADETE_A.id,
        goals: 8,
        birth_year: 2012,
        attendance_pct: 100,
      }),
      player({
        id: "age",
        full_name: "Edad",
        current_team_id: CADETE_A.id,
        goals: 7,
        birth_year: 2009,
      }),
      player({
        id: "attendance",
        full_name: "Asistencia",
        current_team_id: CADETE_A.id,
        goals: 7,
        birth_year: 2010,
        attendance_pct: 95,
        exclusions: 3,
      }),
      player({
        id: "discipline",
        full_name: "Disciplina",
        current_team_id: CADETE_A.id,
        goals: 7,
        birth_year: 2010,
        attendance_pct: 95,
        exclusions: 0,
      }),
    ];
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: orderedPlayers,
      allAvailability: [],
    });

    expect(suggestions.map((suggestion) => suggestion.player_id)).toEqual([
      "previous",
      "goals",
      "age",
      "discipline",
      "attendance",
    ]);
  });

  it("excludes players more than one category below the target (too young to call up)", () => {
    const players = [
      player({
        id: "p-1",
        full_name: "Ana",
        category_code: "cadete",
        current_team_id: CADETE_A.id,
      }),
      player({
        id: "p-2",
        full_name: "Bea",
        category_code: "benjamin",
        current_team_id: "team-benjamin",
      }),
    ];
    const suggestions = suggestCallup({
      targetTeam: CADETE_A,
      scheduledAt: "2026-10-10",
      allTeams,
      allPlayers: players,
      allAvailability: [],
    });
    expect(suggestions.some((s) => s.player_id === "p-2")).toBe(false);
  });
});

describe("defaultCapForPlayer", () => {
  it("returns the player's profile cap when it is free", () => {
    expect(
      defaultCapForPlayer("p-1", { cap_number: 7 }, CADETE_A.id, [
        { player_id: "other", cap_number: 4 },
      ]),
    ).toBe(7);
  });

  it("returns the profile cap even when null (no cap to assign)", () => {
    expect(defaultCapForPlayer("p-1", { cap_number: null }, CADETE_A.id, [])).toBeNull();
  });

  it("finds the next free cap when the profile cap is taken", () => {
    expect(
      defaultCapForPlayer("p-1", { cap_number: 5 }, CADETE_A.id, [
        { player_id: "a", cap_number: 5 },
        { player_id: "b", cap_number: 4 },
      ]),
    ).toBe(6);
  });

  it("wraps around past 99 back to 1", () => {
    const taken = [
      { player_id: "a", cap_number: 99 },
      { player_id: "b", cap_number: 1 },
    ];
    expect(defaultCapForPlayer("p-1", { cap_number: 99 }, CADETE_A.id, taken)).toBe(2);
  });

  it("returns null when all caps from 1 to 99 are taken", () => {
    const taken = Array.from({ length: 99 }, (_, i) => ({
      player_id: `p-${i}`,
      cap_number: i + 1,
    }));
    expect(defaultCapForPlayer("p-x", { cap_number: 5 }, CADETE_A.id, taken)).toBeNull();
  });
});

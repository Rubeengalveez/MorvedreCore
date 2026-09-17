import { describe, expect, it } from "vitest";
import { actaAnalysis } from "@/lib/domain/acta-analysis";
import type { LiveSheet, MatchEvent } from "@/lib/domain/live-match";

const event = (kind: MatchEvent["kind"], extra: Partial<MatchEvent> = {}): MatchEvent => ({
  id: crypto.randomUUID(),
  side: "us",
  cap: 2,
  period: 1,
  keeper: null,
  deleted: false,
  kind,
  ...extra,
});
const sheet = (events: MatchEvent[], extra: Partial<LiveSheet> = {}): LiveSheet => ({
  version: 2,
  players: [
    { id: "a", cap: 2, name: "Jugador" },
    { id: "b", cap: 10, name: "Portero" },
  ],
  opponentCaps: [3],
  periods: 4,
  period: 1,
  phase: "playing",
  keeper: 10,
  events,
  baseline: [],
  baselineThem: 0,
  ...extra,
});

describe("actaAnalysis", () => {
  it("incluye la tanda en tiros, goles y portería sin alterar los cuartos ni duplicar penaltis cometidos", () => {
    const result = actaAnalysis(sheet([
      event("goal_penalty"),
      event("penalty_missed", { missOutcome: "save" }),
      event("goal", { side: "them", cap: 3, keeper: 10 }),
    ], {
      keeperStints: [{ period: 1, cap: 10, afterEventId: null }],
      shootout: {
        firstSide: "us",
        shots: [
          { id: "s1", side: "us", cap: 2, keeper: null, outcome: "goal" },
          { id: "s2", side: "them", cap: 3, keeper: 10, outcome: "save" },
          { id: "s3", side: "us", cap: 2, keeper: null, outcome: "save" },
          { id: "s4", side: "them", cap: 3, keeper: 10, outcome: "goal" },
          { id: "s5", side: "us", cap: 2, keeper: null, outcome: "post" },
          { id: "s6", side: "them", cap: 3, keeper: 10, outcome: "out" },
          { id: "s7", side: "us", cap: 2, keeper: null, outcome: "out" },
        ],
      },
    }));
    expect(result.ownShooting).toMatchObject({ attempts: 6, goals: 2, penaltyGoals: 2, penaltyMisses: 4, outside: 2, onTarget: 4 });
    expect(result.players[0].totals).toMatchObject({ goals: 2, shots: 6, goalsPenalty: 2, penaltiesMissed: 4, penaltiesCommitted: 0 });
    expect(result.players[1].totals).toMatchObject({ received: 4, saves: 1, penaltySaves: 1, conceded: 2, receivedOut: 1 });
    expect(result.players[1].saveRate).toBeCloseTo(100 / 3);
    expect(result.players[1].concededPerQuarter).toBe(1);
    expect(result.rivalScorers[0]).toMatchObject({ goals: 2, share: 100 });
    expect(result.rivalShots).toBe(4);
    expect(result.periods[0]).toMatchObject({ us: 1, them: 1 });
    expect([result.goalsUs, result.goalsThem]).toEqual([1, 1]);
  });
  it("clasifica el destino de los penaltis sin duplicar tiros y conserva los antiguos sin destino", () => {
    const result = actaAnalysis(
      sheet([
        event("goal_penalty"),
        event("penalty_missed", { missOutcome: "out" }),
        event("penalty_missed", { missOutcome: "save" }),
        event("penalty_missed"),
      ]),
    ).ownShooting;
    expect(result).toMatchObject({
      attempts: 4,
      goals: 1,
      outside: 1,
      onTarget: 2,
      unclassified: 1,
      penaltyMisses: 3,
      penaltyAccuracy: 25,
    });
    expect(result.onTarget + result.outside + result.unclassified).toBe(result.attempts);
  });
  it("separa cada fallo y excluye acciones anuladas del porcentaje", () => {
    const result = actaAnalysis(
      sheet([
        event("goal"),
        event("goal_extra"),
        event("shot_out"),
        event("shot_saved"),
        event("shot_blocked"),
        event("shot_corner"),
        event("penalty_missed"),
        event("goal", { deleted: true }),
      ]),
    );
    expect(result.ownShooting).toMatchObject({
      goals: 2,
      misses: 5,
      attempts: 7,
      accuracy: (2 / 7) * 100,
    });
  });
  it("cuenta goles previos en el marcador pero no inventa lanzamientos", () => {
    const result = actaAnalysis(
      sheet([event("goal"), event("shot_out")], {
        baseline: [{ cap: 2, goals: 4, exclusions: 1 }],
        baselineThem: 3,
      }),
    );
    expect(result.goalsUs).toBe(5);
    expect(result.goalsThem).toBe(3);
    expect(result.ownShooting.accuracy).toBe(50);
    expect(result.periods[0]).toMatchObject({ us: 1, them: 0, cumulativeUs: 5, cumulativeThem: 3 });
    expect(result.players[0].goalShare).toBe(100);
  });
  it("la eficacia del portero no incluye tiros fuera ni goles de otro portero", () => {
    const result = actaAnalysis(
      sheet([
        event("save", { cap: 10 }),
        event("penalty_save", { cap: 10 }),
        event("keeper_out", { cap: 10 }),
        event("goal", { side: "them", cap: 3, keeper: 10 }),
        event("goal", { side: "them", cap: 3, keeper: null }),
      ]),
    );
    expect(result.players[1].saveRate).toBeCloseTo((2 / 3) * 100);
    expect(result.unassignedConceded).toBe(1);
    expect(result.players[0].keeper).toBe(false);
  });
  it("reconoce los goles de penalti del flujo anterior", () => {
    const goal = event("goal", { origin: "penalty_flow" });
    const result = actaAnalysis(
      sheet([
        goal,
        event("assist", { related_event_id: goal.id }),
        event("assist", { related_event_id: goal.id }),
        event("penalty_missed"),
      ]),
    );
    expect(result.ownShooting.penaltyAccuracy).toBe(50);
  });
  it("mantiene sin datos los denominadores vacíos y no inventa partes jugadas", () => {
    const result = actaAnalysis(sheet([], { phase: "ready" }));
    expect(result.ownShooting.accuracy).toBeNull();
    expect(result.ownShooting.penaltyAccuracy).toBeNull();
    expect(result.players[1].saveRate).toBeNull();
    expect(result.periods).toEqual([]);
  });
  it("separa expulsiones de penaltis y calcula 1+ solo sobre expulsiones rivales", () => {
    const result = actaAnalysis(
      sheet([
        event("goal_extra"),
        event("exclusion", { side: "them", cap: 3 }),
        event("exclusion", { side: "them", cap: 3 }),
        event("penalty", { side: "them", cap: 3 }),
        event("penalty"),
      ]),
    );
    expect(result.extraRate).toBe(50);
    expect(result.players[0].expulsions).toBe(0);
    expect(result.players[0].totals.exclusions).toBe(1);
    expect(result.players[0].totals.penaltiesCommitted).toBe(1);
  });
  it("clasifica los tiros y obtiene los tiros rivales de la portería sin duplicarlos", () => {
    const result = actaAnalysis(
      sheet([
        event("goal"),
        event("shot_out"),
        event("shot_saved"),
        event("shot_blocked"),
        event("shot_corner"),
        event("penalty_missed"),
        event("save", { cap: 10 }),
        event("penalty_save", { cap: 10 }),
        event("keeper_out", { cap: 10 }),
        event("goal", { side: "them", cap: 3, keeper: 10 }),
      ]),
    );
    expect(result.ownShooting).toMatchObject({
      attempts: 6,
      onTarget: 4,
      outside: 1,
      unclassified: 1,
    });
    expect(result.rivalShots).toBe(4);
    expect(result.rivalMisses).toBe(3);
    expect(result.rivalScorers[0]).toMatchObject({ cap: 3, goals: 1, share: 100 });
  });
  it("representa una remontada dentro del cuarto, no solo el resultado final", () => {
    const result = actaAnalysis(
      sheet([
        ...Array.from({ length: 3 }, () => event("goal", { side: "them", cap: 3, keeper: 10 })),
        ...Array.from({ length: 4 }, () => event("goal")),
        event("goal", { deleted: true }),
      ]),
    );
    expect(
      result.goalProgression.filter((p) => p.quarter === null).map((p) => [p.us, p.them]),
    ).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
    ]);
    expect(result.goalProgression.at(-1)).toMatchObject({
      quarter: 1,
      us: 4,
      them: 3,
      position: 1,
    });
  });
  it("marca también los cuartos sin goles y mantiene el marcador importado", () => {
    const result = actaAnalysis(sheet([], { phase: "finished", baselineThem: 2 }));
    expect(result.goalProgression.map((p) => p.quarter)).toEqual([0, 1, 2, 3, 4]);
    expect(result.goalProgression.every((p) => p.us === 0 && p.them === 2)).toBe(true);
  });
});

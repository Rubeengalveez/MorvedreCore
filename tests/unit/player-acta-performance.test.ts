import { describe, expect, it } from "vitest";
import { playerActaPerformance } from "@/lib/domain/player-acta-performance";
import type { LiveSheet, MatchEvent } from "@/lib/domain/live-match";
const playerId = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";
function event(n: number, kind: MatchEvent["kind"], deleted = false): MatchEvent {
  return {
    id: `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    side: "us",
    cap: 2,
    playerId,
    period: 1,
    keeper: null,
    kind,
    deleted,
  };
}
function sheet(): LiveSheet {
  return {
    version: 2,
    phase: "finished",
    periods: 4,
    period: 4,
    players: [
      { id: playerId, cap: 2, name: "Jugador" },
      { id: otherId, cap: 3, name: "Otro" },
    ],
    opponentCaps: [1],
    keeper: null,
    events: [
      event(1, "goal"),
      event(2, "shot_saved"),
      event(3, "shot_out"),
      event(4, "goal", true),
    ],
    baseline: [],
    baselineThem: 0,
  };
}
describe("Estadísticas del jugador desde actas", () => {
  it("suma partidos finalizados, excluye borrados y calcula la eficacia ponderada", () => {
    const second = { ...sheet(), events: [event(5, "goal_extra"), event(6, "goal_penalty")] };
    const result = playerActaPerformance([sheet(), second], playerId);
    expect(result).toMatchObject({
      goals: 3,
      matches: 2,
      shots: 5,
      shootingPercent: 60,
      goalsPerMatch: 1.5,
    });
  });
  it("los goles importados cuentan para las medias pero no inventan intentos de tiro", () => {
    const result = playerActaPerformance(
      [{ ...sheet(), baseline: [{ cap: 2, playerId, goals: 4, exclusions: 0 }] }],
      playerId,
    );
    expect(result.goals).toBe(5);
    expect(result.shots).toBe(3);
    expect(result.shootingPercent).toBeCloseTo(100 / 3);
  });
  it("omite actas abiertas, inválidas y jugadores ajenos", () => {
    expect(
      playerActaPerformance([{ ...sheet(), phase: "playing" }, {}, sheet()], "missing"),
    ).toMatchObject({
      matches: 0,
      shootingPercent: null,
      goalsPerMatch: null,
      assistsPerMatch: null,
    });
  });
  it("sin tiros se muestra sin dato, con un partido de cero goles en el denominador", () => {
    const result = playerActaPerformance([{ ...sheet(), events: [] }], playerId);
    expect(result).toMatchObject({ matches: 1, goals: 0, goalsPerMatch: 0, shootingPercent: null });
  });
});

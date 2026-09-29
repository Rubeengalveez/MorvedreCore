import { describe, expect, it } from "vitest";
import { editLiveRoster, playerHasRecordedHistory } from "@/lib/domain/live-match-roster-edit";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { playerTotals, score, type LiveSheet, type MatchEvent } from "@/lib/domain/live-match";

const keeper = { id: "10000000-0000-4000-8000-000000000001", cap: 1, name: "Portero" };
const juan = { id: "10000000-0000-4000-8000-000000000002", cap: 5, name: "Juan" };
const pepe = { id: "10000000-0000-4000-8000-000000000003", cap: 5, name: "Pepe" };

function event(
  kind: MatchEvent["kind"],
  cap: number,
  side: "us" | "them" = "us",
  keeperCap: number | null = null,
): MatchEvent {
  return {
    id: crypto.randomUUID(),
    side,
    cap,
    kind,
    period: 1,
    keeper: keeperCap,
    deleted: false,
  };
}

function sheet(): LiveSheet {
  return {
    version: 2,
    players: [keeper, juan],
    opponentCaps: [1, 2, 3],
    periods: 4,
    period: 1,
    phase: "playing",
    keeper: 1,
    events: [],
    baseline: [],
    baselineThem: 0,
  };
}

describe("correcciones de convocatoria durante el acta", () => {
  it("asocia una jugada al ID y conserva el gorro original al cambiar números", () => {
    const original = sheet();
    original.events = [event("goal", 5)];
    const identified = identifyLiveSheet(original);
    const changed = editLiveRoster(identified, [keeper, { ...juan, cap: 2 }], []);
    expect(changed.events[0]).toMatchObject({ playerId: juan.id, cap: 2, capAtEvent: 5 });
    expect(playerTotals(changed, "us", 2).goals).toBe(1);
    expect(score(changed, "us")).toBe(1);
  });

  it("traslada todas las acciones de Juan a Pepe sin cambiar el marcador", () => {
    const original = sheet();
    original.events = [event("goal", 5), event("assist", 5), event("exclusion", 5)];
    original.events[1].related_event_id = undefined;
    const changed = editLiveRoster(
      original,
      [keeper, pepe],
      [{ fromPlayerId: juan.id, toPlayerId: pepe.id }],
    );
    expect(changed.players.some((player) => player.id === juan.id)).toBe(false);
    expect(changed.events.every((entry) => entry.playerId === pepe.id)).toBe(true);
    expect(playerTotals(changed, "us", 5)).toMatchObject({ goals: 1, assists: 1, exclusions: 1 });
    expect(score(changed, "us")).toBe(1);
  });

  it("intercambia dos gorros sin intercambiar sus estadísticas", () => {
    const jose = { id: "10000000-0000-4000-8000-000000000004", cap: 2, name: "José" };
    const original = sheet();
    original.players.push(jose);
    original.events = [event("goal", 5), event("goal", 5), event("goal", 5)];
    const changed = editLiveRoster(
      original,
      [keeper, { ...juan, cap: 2 }, { ...jose, cap: 5 }],
      [],
    );
    expect(playerTotals(changed, "us", 2).goals).toBe(3);
    expect(playerTotals(changed, "us", 5).goals).toBe(0);
    expect(changed.events.every((entry) => entry.playerId === juan.id)).toBe(true);
    expect(score(changed, "us")).toBe(3);
  });

  it("conserva el historial de portería al corregir al jugador del gorro 1", () => {
    const original = sheet();
    original.events = [event("save", 1), event("goal", 2, "them", 1)];
    original.keeperStints = [{ cap: 1, period: 1, afterEventId: null }];
    const newKeeper = { id: pepe.id, cap: 1, name: "Pepe" };
    const changed = editLiveRoster(
      original,
      [newKeeper, juan],
      [{ fromPlayerId: keeper.id, toPlayerId: pepe.id }],
    );
    expect(changed.keeper).toBe(1);
    expect(changed.keeperStints?.[0].playerId).toBe(pepe.id);
    expect(playerTotals(changed, "us", 1)).toMatchObject({ saves: 1, conceded: 1 });
  });

  it("impide borrar a un jugador con jugadas sin elegir sustituto", () => {
    const original = sheet();
    original.events = [event("goal", 5)];
    expect(playerHasRecordedHistory(identifyLiveSheet(original), juan.id)).toBe(true);
    expect(() => editLiveRoster(original, [keeper], [])).toThrow(/Elige quién/);
  });

  it("permite quitar un convocado sin acciones", () => {
    const changed = editLiveRoster(sheet(), [keeper], []);
    expect(changed.players.map((player) => player.id)).toEqual([keeper.id]);
  });

  it("mantiene la portería en el gorro 1 o 13 aunque el anterior portero cambie de gorro", () => {
    const changed = editLiveRoster(
      sheet(),
      [
        { ...keeper, cap: 5 },
        { ...juan, cap: 1 },
      ],
      [],
    );
    expect(changed.keeper).toBe(1);
  });
});

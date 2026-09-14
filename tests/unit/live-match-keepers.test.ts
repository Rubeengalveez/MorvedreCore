import { describe, expect, it } from "vitest";
import { keeperQuarters, selectMatchKeeper } from "@/lib/domain/live-match-keepers";
import { sheetSchema, type LiveSheet, type MatchEvent } from "@/lib/domain/live-match";
import { reconcileLiveRoster } from "@/lib/domain/live-match-roster";

const players = [1, 13, 2].map((cap) => ({ id: crypto.randomUUID(), cap, name: `Jugador ${cap}` }));
const sheet = (): LiveSheet => ({
  version: 2,
  players,
  opponentCaps: [3],
  periods: 4,
  period: 1,
  phase: "ready",
  keeper: 1,
  events: [],
  baseline: [],
  baselineThem: 0,
});
const event = (
  kind: MatchEvent["kind"],
  cap: number,
  extra: Partial<MatchEvent> = {},
): MatchEvent => ({
  id: crypto.randomUUID(),
  kind,
  side: "us",
  cap,
  keeper: null,
  period: 1,
  deleted: false,
  ...extra,
});

describe("cuartos de portería", () => {
  it("cuenta un cuarto sin intervenciones y pregunta una nueva elección al empezar el siguiente", () => {
    const first = selectMatchKeeper(sheet(), 1, "start");
    const next = selectMatchKeeper({ ...first, phase: "break" }, 13, "start");
    expect(next).toMatchObject({ keeper: 13, period: 2, phase: "playing" });
    expect(keeperQuarters(next, 1)).toEqual([1]);
    expect(keeperQuarters(next, 13)).toEqual([2]);
    expect(sheetSchema.parse(next).keeperStints).toEqual(next.keeperStints);
  });
  it("una corrección inmediata no suma el cuarto al portero equivocado", () => {
    const first = selectMatchKeeper(sheet(), 1, "start");
    const corrected = selectMatchKeeper(first, 13, "correct");
    expect(keeperQuarters(corrected, 1)).toEqual([]);
    expect(keeperQuarters(corrected, 13)).toEqual([1]);
  });
  it("un cambio real cuenta ambos, sin duplicar cuartos al volver al mismo portero", () => {
    const first = selectMatchKeeper(sheet(), 1, "start");
    const next = selectMatchKeeper(first, 13, "change");
    const returned = selectMatchKeeper(next, 1, "change");
    expect(keeperQuarters(returned, 1)).toEqual([1]);
    expect(keeperQuarters(returned, 13)).toEqual([1]);
  });
  it("corrige solo las acciones del último tramo y conserva participaciones anteriores", () => {
    let s = selectMatchKeeper(sheet(), 1, "start");
    const early = event("save", 1);
    s = { ...s, events: [early] };
    s = selectMatchKeeper(s, 13, "change");
    const later = event("save", 13);
    const goal = event("goal", 3, { side: "them", keeper: 13 });
    const sanction = event("penalty", 13);
    s = selectMatchKeeper({ ...s, events: [...s.events, later, goal, sanction] }, 1, "correct");
    expect(s.events[0]).toEqual(early);
    expect(s.events[1].cap).toBe(1);
    expect(s.events[2].keeper).toBe(1);
    expect(s.events[3].cap).toBe(13);
    expect(keeperQuarters(s, 13)).toEqual([]);
    expect(keeperQuarters(s, 1)).toEqual([1]);
    expect(sheetSchema.safeParse(s).success).toBe(true);
  });
  it("conserva la identidad del portero al cambiar los gorros de la convocatoria", () => {
    const first = selectMatchKeeper(sheet(), 1, "start");
    const remapped = reconcileLiveRoster(
      first,
      players.map((p) => (p.cap === 1 ? { ...p, cap: 8 } : p)),
    );
    expect(keeperQuarters(remapped, 8)).toEqual([1]);
    expect(remapped.keeper).toBe(8);
  });
  it("rechaza cuartos futuros y porteros ajenos a la convocatoria", () => {
    expect(
      sheetSchema.safeParse({
        ...sheet(),
        keeperStints: [{ cap: 99, period: 1, afterEventId: null }],
      }).success,
    ).toBe(false);
    expect(
      sheetSchema.safeParse({
        ...sheet(),
        keeperStints: [{ cap: 1, period: 2, afterEventId: null }],
      }).success,
    ).toBe(false);
  });
});

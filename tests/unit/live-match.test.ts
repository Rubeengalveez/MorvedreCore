import { describe, it, expect } from "vitest";
import {
  defaultPeriods,
  playerTotals,
  score,
  sheetSchema,
  type LiveSheet,
  type MatchEvent,
} from "@/lib/domain/live-match";

export function sampleSheet(): LiveSheet {
  return {
    version: 1,
    players: [
      { id: "10000000-0000-4000-8000-000000000001", cap: 1, name: "Álex" },
      { id: "10000000-0000-4000-8000-000000000002", cap: 2, name: "Marcos" },
    ],
    opponentCaps: [1, 2, 3],
    periods: 4,
    period: 2,
    phase: "playing",
    keeper: 1,
    events: [],
    baseline: [],
    baselineThem: 0,
  };
}
let n = 0;
function event(kind: MatchEvent["kind"], overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: `20000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    side: "us",
    cap: 2,
    kind,
    period: 1,
    keeper: null,
    deleted: false,
    ...overrides,
  };
}
describe("acta en directo", () => {
  it("counts penalties toward the three personal exclusions", () => {
    const s = sampleSheet();
    s.events = [event("penalty"), event("exclusion")];
    expect(playerTotals(s, "us", 2).exclusions).toBe(2);
    s.events.push(event("penalty"));
    expect(sheetSchema.safeParse(s).success).toBe(true);
    s.events.push(event("exclusion"));
    expect(sheetSchema.safeParse(s).success).toBe(false);
  });
  it("counts every goal variant once in global and period scores", () => {
    const s = sampleSheet();
    s.events = [event("goal"), event("goal_extra"), event("goal_penalty", { period: 2 })];
    expect(score(s, "us")).toBe(3);
    expect(score(s, "us", 1)).toBe(2);
    expect(playerTotals(s, "us", 2).shots).toBe(3);
  });
  it("links rival goals and penalty saves to keeper totals without double counting", () => {
    const s = sampleSheet();
    s.events = [
      event("goal", { side: "them", keeper: 1 }),
      event("save", { cap: 1 }),
      event("penalty_save", { cap: 1 }),
    ];
    expect(playerTotals(s, "us", 1)).toMatchObject({ saves: 2, conceded: 1, received: 3 });
    expect(score(s, "them")).toBe(1);
  });
  it("undo removes the linked conceded goal and global score", () => {
    const s = sampleSheet();
    s.events = [event("goal", { side: "them", keeper: 1, deleted: true })];
    expect(score(s, "them")).toBe(0);
    expect(playerTotals(s, "us", 1).conceded).toBe(0);
  });
  it("red and yellow do not invent personal exclusions", () => {
    const s = sampleSheet();
    s.events = [event("red"), event("yellow")];
    expect(playerTotals(s, "us", 2)).toMatchObject({ red: true, yellow: true, exclusions: 0 });
  });
  it("allows keepers to score and be excluded", () => {
    const s = sampleSheet();
    s.events = [event("goal", { cap: 1 }), event("exclusion", { cap: 1 })];
    expect(playerTotals(s, "us", 1)).toMatchObject({ goals: 1, exclusions: 1 });
  });
  it("retains simple totals without inventing periods", () => {
    const s = sampleSheet();
    s.baseline = [{ cap: 2, goals: 4, exclusions: 1 }];
    s.baselineThem = 3;
    expect(score(s, "us")).toBe(4);
    expect(score(s, "us", 1)).toBe(0);
    expect(score(s, "them")).toBe(3);
  });
  it("corrections change scorer and partial while preserving global", () => {
    const s = sampleSheet();
    s.events = [event("goal", { cap: 1, period: 2 })];
    expect(playerTotals(s, "us", 2).goals).toBe(0);
    expect(score(s, "us", 1)).toBe(0);
    expect(score(s, "us", 2)).toBe(1);
  });
  it("keeps coach cards and timeouts out of player stats", () => {
    const s = sampleSheet();
    s.events = [event("timeout", { cap: null }), event("coach_red", { cap: null })];
    expect(sheetSchema.safeParse(s).success).toBe(true);
    expect(playerTotals(s, "us", 2).red).toBe(false);
  });
  it.each(["benjamin", "alevin", "infantil"])("defaults %s to six periods", (c) =>
    expect(defaultPeriods(c)).toBe(6),
  );
  it.each(["cadete", "juvenil", "absoluto"])("defaults %s to four periods", (c) =>
    expect(defaultPeriods(c)).toBe(4),
  );
  it("rejects duplicate jugadas, unknown caps and future periods", () => {
    const s = sampleSheet();
    const e = event("goal");
    s.events = [e, e];
    expect(sheetSchema.safeParse(s).success).toBe(false);
    s.events = [event("goal", { cap: 99 })];
    expect(sheetSchema.safeParse(s).success).toBe(false);
    s.events = [event("goal", { period: 3 })];
    expect(sheetSchema.safeParse(s).success).toBe(false);
  });
  it("requires the keeper for a rival goal", () => {
    const s = sampleSheet();
    s.events = [event("goal", { side: "them" })];
    expect(sheetSchema.safeParse(s).success).toBe(false);
  });
});

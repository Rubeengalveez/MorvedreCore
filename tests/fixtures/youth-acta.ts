import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { sheetSchema, type LiveRecord, type LiveSheet, type Side } from "@/lib/domain/live-match";
import { prepareParticipation, saveLineups } from "@/lib/domain/live-match-participation";

export const youthKey = (cap: number) => `00000000-0000-4000-8000-${String(cap).padStart(12, "0")}`;

export function youthSheet(
  category = "infantil",
  caps = Array.from({ length: 14 }, (_, i) => i + 1),
) {
  return identifyLiveSheet(
    prepareParticipation(
      sheetSchema.parse({
        version: 2,
        players: caps.map((cap) => ({ id: youthKey(cap), cap, name: `Jugador ${cap}` })),
        opponentCaps: caps,
        periods: 6,
        period: 1,
        phase: "ready",
        keeper: 1,
        events: [],
        baseline: [],
        baselineThem: 0,
      }),
      category,
    ),
  );
}

export function youthLineups(period: number, field = [2, 3, 4, 5, 6, 7]) {
  return (["us", "them"] as Side[]).map((side) => ({
    side,
    period,
    keeper: side === "us" ? youthKey(1) : "1",
    field: field.map((cap) => (side === "us" ? youthKey(cap) : String(cap))),
  }));
}

export function startYouth(sheet: LiveSheet, period: number, field = [2, 3, 4, 5, 6, 7]) {
  return identifyLiveSheet(
    saveLineups(
      { ...sheet, phase: period === 1 ? "ready" : "break", period: Math.max(1, period - 1) },
      youthLineups(period, field),
      "start",
    ),
  );
}

export function youthRecord(sheet = youthSheet()): LiveRecord {
  return {
    matchId: youthKey(100),
    owner: youthKey(101),
    viewer: youthKey(101),
    device: youthKey(102),
    mutation: youthKey(103),
    revision: 1,
    dirty: false,
    canEdit: true,
    team: "Infantil",
    opponent: "Rival",
    date: "2026-10-01T12:00:00Z",
    homeAway: "home",
    sheet,
  };
}

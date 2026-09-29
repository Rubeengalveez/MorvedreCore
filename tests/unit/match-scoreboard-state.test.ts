import { describe, expect, it } from "vitest";

import { sheetSchema } from "@/lib/domain/live-match";
import { getMatchScoreboardState } from "@/lib/domain/match-scoreboard-state";

const sheet = sheetSchema.parse({
  version: 2,
  players: [{ id: "10000000-0000-4000-8000-000000000001", cap: 1, name: "Portero" }],
  opponentCaps: [1],
  periods: 4,
  period: 2,
  phase: "playing",
  keeper: 1,
  baseline: [],
  baselineThem: 0,
  events: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      side: "us",
      cap: 1,
      kind: "goal",
      period: 1,
      keeper: null,
      deleted: false,
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      side: "us",
      cap: 1,
      kind: "goal",
      period: 2,
      keeper: null,
      deleted: true,
    },
  ],
});

describe("marcador de la ficha del partido", () => {
  it("muestra los goles sincronizados aunque el partido siga marcado como programado", () => {
    expect(
      getMatchScoreboardState({
        status: "scheduled",
        isHome: true,
        finalScoreUs: null,
        finalScoreThem: null,
        sheet,
      }),
    ).toMatchObject({ mode: "live", homeScore: 1, awayScore: 0, period: 2 });
  });

  it("invierte el marcador si Morvedre juega como visitante", () => {
    expect(
      getMatchScoreboardState({
        status: "scheduled",
        isHome: false,
        finalScoreUs: null,
        finalScoreThem: null,
        sheet,
      }),
    ).toMatchObject({ mode: "live", homeScore: 0, awayScore: 1 });
  });

  it("no presenta como jugado un acta que todavía está preparada", () => {
    expect(
      getMatchScoreboardState({
        status: "scheduled",
        isHome: true,
        finalScoreUs: null,
        finalScoreThem: null,
        sheet: { ...sheet, phase: "ready" },
      }),
    ).toMatchObject({ mode: "preview", homeScore: null, awayScore: null });
  });
});

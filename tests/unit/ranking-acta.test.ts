import { describe, expect, it } from "vitest";

import { contributionsFromFinishedActa } from "@/lib/domain/ranking-acta";
import type { LiveSheet, MatchEvent } from "@/lib/domain/live-match";

const scorerId = "10000000-0000-4000-8000-000000000001";
const assistantId = "10000000-0000-4000-8000-000000000002";

function event(id: number, kind: MatchEvent["kind"], cap: number, deleted = false): MatchEvent {
  return {
    id: `20000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    side: "us",
    cap,
    kind,
    period: 1,
    keeper: null,
    deleted,
  };
}

function sheet(): LiveSheet {
  return {
    version: 2,
    players: [
      { id: scorerId, cap: 1, name: "Goleador" },
      { id: assistantId, cap: 2, name: "Asistente" },
    ],
    opponentCaps: [1],
    periods: 4,
    period: 4,
    phase: "finished",
    keeper: null,
    events: [
      event(1, "goal", 1),
      { ...event(2, "assist", 2), related_event_id: "20000000-0000-4000-8000-000000000001" },
      event(3, "goal_extra", 1),
      event(4, "goal_penalty", 1),
      event(5, "goal", 1, true),
      event(6, "assist", 2, true),
    ],
    baseline: [],
    baselineThem: 0,
  };
}

describe("contributionsFromFinishedActa", () => {
  it("counts only active goals and assists from a finished acta", () => {
    expect(contributionsFromFinishedActa(sheet())).toEqual([
      { playerId: scorerId, goals: 3, assists: 0 },
      { playerId: assistantId, goals: 0, assists: 1 },
    ]);
  });

  it("ignores unfinished and invalid actas", () => {
    expect(contributionsFromFinishedActa({ ...sheet(), phase: "playing" })).toEqual([]);
    expect(contributionsFromFinishedActa({ phase: "finished" })).toEqual([]);
  });
});

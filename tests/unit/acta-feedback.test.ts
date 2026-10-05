import { describe, expect, it } from "vitest";
import { actaAnalysis } from "@/lib/domain/acta-analysis";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { playerTotals, sheetSchema, type MatchEvent } from "@/lib/domain/live-match";
import {
  timeoutStatus,
  timeoutRegistrationError,
  validateTimeoutChanges,
} from "@/lib/domain/live-match-timeouts";
import { keeperSwapCandidates, swapKeeperCap } from "@/lib/domain/live-match-keeper-swap";
import {
  currentKeeperKey,
  currentParticipants,
  lineupIssues,
  playedPeriods,
  saveLineups,
  replaceParticipant,
} from "@/lib/domain/live-match-participation";
import { keeperQuarters } from "@/lib/domain/live-match-keepers";
import { startYouth, youthSheet, youthKey } from "@/tests/fixtures/youth-acta";

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

describe("feedback de delegados del acta", () => {
  it("contraataque con asistencia, bloqueo ofensivo y defensa mantienen cuentas separadas", () => {
    const goal = event("goal_counter");
    const sheet = identifyLiveSheet({
      ...startYouth(youthSheet(), 1),
      events: [
        goal,
        event("assist", { cap: 3, related_event_id: goal.id }),
        event("shot_deflected"),
        event("shot_blocked"),
        event("shot_saved"),
        event("shot_out"),
        event("defensive_block"),
      ],
    });
    expect(sheetSchema.safeParse(sheet).success).toBe(true);
    expect(playerTotals(sheet, "us", 2)).toMatchObject({
      goals: 1,
      goalsCounter: 1,
      goalsNormal: 0,
      shots: 5,
      shotsBlocked: 1,
      shotsSaved: 2,
      defensiveBlocks: 1,
    });
    const analysis = actaAnalysis(sheet);
    expect(analysis.ownShooting).toMatchObject({
      goals: 1,
      attempts: 5,
      onTarget: 3,
      blocked: 1,
      accuracy: 20,
      onTargetRate: 60,
    });
    expect(analysis.rivalShots).toBe(1);
    expect(analysis.players.find((p) => p.cap === 1)?.totals.received).toBe(0);
    expect(analysis.players.find((p) => p.cap === 3)?.totals.assists).toBe(1);
  });

  it.each(["benjamin", "alevin", "infantil", "cadete", "juvenil", "absoluto"] as const)(
    "respeta el cupo provisional de %s para los dos equipos",
    (category) => {
      const sheet = { ...youthSheet(), category, phase: "playing" as const };
      const limit = ["benjamin", "alevin"].includes(category) ? 0 : 2;
      for (const side of ["us", "them"] as const) {
        expect(timeoutStatus(sheet, side).limit).toBe(limit);
        const full = {
          ...sheet,
          events: Array.from({ length: limit }, () => event("timeout", { side, cap: null })),
        };
        expect(timeoutStatus(full, side)).toMatchObject({ remaining: 0, allowed: false });
        expect(timeoutRegistrationError(full, side)).not.toBe("");
        expect(() =>
          validateTimeoutChanges(
            { ...full, events: [...full.events, event("timeout", { side, cap: null })] },
            full,
          ),
        ).toThrow();
        expect(timeoutStatus({ ...full, period: 2 }, side).remaining).toBe(0);
        if (limit) {
          expect(timeoutRegistrationError(full, side, full.events[0].id)).toBe("");
          expect(
            timeoutStatus(
              { ...full, events: full.events.map((e, i) => ({ ...e, deleted: i === 0 })) },
              side,
            ).remaining,
          ).toBe(1);
        }
      }
    },
  );

  it("conserva un acta antigua que excedía el cupo sin permitir incrementarlo ni reemplazar tiempos", () => {
    const sheet = {
      ...youthSheet(),
      events: Array.from({ length: 3 }, () => event("timeout", { cap: null })),
    };
    expect(() => validateTimeoutChanges(sheet, sheet)).not.toThrow();
    expect(() =>
      validateTimeoutChanges(
        { ...sheet, events: [...sheet.events, event("timeout", { cap: null })] },
        sheet,
      ),
    ).toThrow();
    expect(() =>
      validateTimeoutChanges(
        { ...sheet, events: [...sheet.events.slice(1), event("timeout", { cap: null })] },
        sheet,
      ),
    ).toThrow();
    expect(timeoutRegistrationError({ ...sheet, events: [], phase: "break" }, "us")).toContain(
      "entre cuartos",
    );
  });

  it("intercambia gorros conservando identidad, participación e historial de los dos porteros", () => {
    let sheet = startYouth(youthSheet(), 1);
    sheet = identifyLiveSheet({
      ...sheet,
      events: [
        event("save", { cap: 1 }),
        event("goal", { side: "them", cap: 3, keeper: 1 }),
        event("goal", { cap: 2 }),
      ],
    });
    const before = currentParticipants(sheet, "us");
    let next = swapKeeperCap(sheet, youthKey(2));
    next = identifyLiveSheet(next, sheet);
    expect(next.players.find((p) => p.id === youthKey(2))?.cap).toBe(1);
    expect(next.players.find((p) => p.id === youthKey(1))?.cap).toBe(2);
    expect(currentParticipants(next, "us")).toEqual(before);
    expect(currentKeeperKey(next, "us")).toBe(youthKey(2));
    expect(playerTotals(next, "us", 2)).toMatchObject({ saves: 1, conceded: 1, goals: 0 });
    expect(playerTotals(next, "us", 1)).toMatchObject({ goals: 1, saves: 0, conceded: 0 });
    expect(next.events[0]).toMatchObject({ cap: 2, playerId: youthKey(1), capAtEvent: 1 });
    expect(next.events[2]).toMatchObject({ cap: 1, playerId: youthKey(2), capAtEvent: 2 });
    expect(playedPeriods(next, "us", youthKey(1))).toEqual([1]);
    expect(playedPeriods(next, "us", youthKey(2))).toEqual([1]);
    expect(lineupIssues(next, next.participation!.lineups[0])).toEqual([]);
    expect(keeperQuarters(next, 1)).toEqual([1]);
    expect(keeperQuarters(next, 2)).toEqual([1]);
    expect(sheetSchema.safeParse(next).success).toBe(true);
    const corrected = saveLineups(next, next.participation!.lineups, "correct");
    expect(corrected.events).toEqual(next.events);
    expect(corrected.keeperStints).toEqual(next.keeperStints);
    next = identifyLiveSheet(
      { ...next, events: [...next.events, event("save", { cap: 1 })] },
      next,
    );
    expect(playerTotals(next, "us", 1).saves).toBe(1);
    expect(playerTotals(next, "us", 2).saves).toBe(1);
  });

  it("solo ofrece jugadores del agua y rechaza sancionados, jugadas pendientes y categorías mayores", () => {
    const sheet = startYouth(youthSheet(), 1);
    expect(keeperSwapCandidates(sheet).some((p) => p.cap === 8)).toBe(false);
    expect(() => swapKeeperCap(sheet, youthKey(8))).toThrow();
    expect(keeperSwapCandidates({ ...sheet, category: "cadete" })).toEqual([]);
    expect(() => swapKeeperCap({ ...sheet, category: "cadete" }, youthKey(2))).toThrow();
    expect(() =>
      swapKeeperCap(
        { ...sheet, pending: { kind: "assist", goal_event_id: youthKey(200) } },
        youthKey(2),
      ),
    ).toThrow();
    expect(
      keeperSwapCandidates({ ...sheet, events: [event("red")] }).some((p) => p.cap === 2),
    ).toBe(false);
  });
  it("puede sustituir por sanción al nuevo portero después del intercambio", () => {
    const swapped = swapKeeperCap(startYouth(youthSheet(), 1), youthKey(2));
    const red = event("red", { cap: 1 });
    const sanctioned = identifyLiveSheet({ ...swapped, events: [red] });
    const replaced = identifyLiveSheet(
      replaceParticipant(sanctioned, {
        id: youthKey(300),
        period: 1,
        side: "us",
        incoming: youthKey(13),
        outgoing: youthKey(2),
        reason: "sanction",
        eventId: red.id,
      }),
    );
    expect(replaced.keeper).toBe(13);
    expect(currentKeeperKey(replaced, "us")).toBe(youthKey(13));
    expect(currentParticipants(replaced, "us")?.has(youthKey(1))).toBe(true);
    expect(currentParticipants(replaced, "us")?.has(youthKey(2))).toBe(false);
    expect(sheetSchema.safeParse(replaced).success).toBe(true);
  });
});

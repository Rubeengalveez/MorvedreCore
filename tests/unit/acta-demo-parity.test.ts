import { describe, expect, it } from "vitest";
import { sheetSchema, type Side } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import {
  eligibleForAction,
  outstandingReplacement,
  replaceParticipant,
  rotationAdvice,
  saveLineups,
} from "@/lib/domain/live-match-participation";
import { startYouth, youthKey, youthLineups, youthSheet } from "@/tests/fixtures/youth-acta";
import { orderedScore } from "@/lib/domain/live-match-score";
import { fitPlayerName } from "@/lib/domain/player-name";
import { emergencyKeeperCaps } from "@/lib/domain/live-match-goalkeeper-role";
import { controlsParticipation } from "@/lib/domain/live-match-participation";
import { exclusionLimit, rosterRequirementError } from "@/lib/domain/live-match-rules";

describe("correcciones de la demo aplicadas a Core", () => {
  it.each(["benjamin", "alevin", "infantil", "cadete", "juvenil", "absoluto"])(
    "conserva las normas propias de %s y libera la participación en el quinto",
    (category) => {
      const sheet = {
        ...youthSheet(),
        category: category as ReturnType<typeof youthSheet>["category"],
        period: 5,
      };
      expect(exclusionLimit(sheet)).toBe(category === "benjamin" ? 4 : 3);
      expect(controlsParticipation(sheet)).toBe(false);
      expect(rotationAdvice(sheet, "us", 5)).toEqual([]);
    },
  );

  it.each(["us", "them"] as Side[])(
    "Core no importa la excepción de siete Benjamines: %s",
    (side) => {
      expect(rosterRequirementError("benjamin", [1, 2, 3, 4, 5, 7, 8], side)).toContain("mínimo 8");
    },
  );

  it.each(["home", "away", "neutral"] as const)(
    "mantiene resultado y parcial en el mismo orden: %s",
    (homeAway) => {
      const sheet = {
        ...youthSheet(),
        events: [
          {
            id: youthKey(200),
            side: "us" as const,
            cap: 2,
            kind: "goal" as const,
            period: 1,
            keeper: null,
            deleted: false,
          },
        ],
      };
      const expected = homeAway === "away" ? { home: 0, away: 1 } : { home: 1, away: 0 };
      expect(orderedScore(sheet, homeAway)).toMatchObject(expected);
      expect(orderedScore(sheet, homeAway, 1)).toMatchObject(expected);
    },
  );

  it("ajusta nombres largos a una sola línea con abreviación progresiva", () => {
    expect(
      [20, 12, 10, 6].map((width) =>
        fitPlayerName("Pepe Juan Marco", width, (text) => text.length),
      ),
    ).toEqual(["Pepe Juan Marco", "Pepe Juan M.", "Pepe J. M.", "Pepe…"]);
  });

  it("solo reconoce un portero de emergencia si la sanción afecta al portero que jugaba", () => {
    const initial = startYouth(youthSheet(), 1);
    const event = {
      id: youthKey(203),
      side: "us" as const,
      cap: 13,
      kind: "red" as const,
      period: 1,
      keeper: 1,
      deleted: false,
    };
    const forged = {
      ...initial,
      events: [event],
      participation: {
        ...initial.participation!,
        changes: [
          {
            id: youthKey(204),
            period: 1,
            side: "us" as const,
            incoming: youthKey(9),
            outgoing: youthKey(13),
            reason: "sanction" as const,
            eventId: event.id,
          },
        ],
      },
    };
    expect(emergencyKeeperCaps(forged, "us")).toEqual([]);
    expect(sheetSchema.safeParse({ ...forged, keeper: 9 }).success).toBe(false);
  });
  it.each(["us", "them"] as Side[])(
    "bloquea una roja al iniciar el siguiente cuarto: %s",
    (side) => {
      const sheet = startYouth(youthSheet(), 1);
      const sanctioned = identifyLiveSheet({
        ...sheet,
        events: [
          { id: youthKey(200), side, cap: 2, kind: "red", period: 1, keeper: null, deleted: false },
        ],
      });
      expect(() =>
        saveLineups(
          { ...sanctioned, phase: "break" },
          youthLineups(2),
          "start",
          "Revisado con el árbitro",
        ),
      ).toThrow("expulsado");
      expect(() =>
        saveLineups({ ...sanctioned, phase: "break" }, youthLineups(1), "correct"),
      ).not.toThrow();
    },
  );

  it.each(["alevin", "infantil"])("prevé la falta de elegibles por descanso en %s", (category) => {
    const field = category === "infantil" ? [2, 3, 4, 5, 6, 7] : [2, 3, 4, 5, 6];
    const caps = Array.from({ length: field.length + 3 }, (_, i) => i + 1);
    const sheet = startYouth(startYouth(youthSheet(category, caps), 1, field), 2, field);
    const advice = rotationAdvice(sheet, "us", 3, youthLineups(3, field)[0]);
    expect(advice.find((a) => a.kind === "capacity")?.message).toContain("Morvedre:");
    expect(advice.find((a) => a.kind === "capacity")?.message).toContain(
      `2 jugadores de campo disponibles para ${field.length} plazas en el cuarto 4`,
    );
  });

  it("desde el quinto cuarto libera el descanso tras una sustitución obligatoria", () => {
    let sheet = youthSheet();
    for (let period = 1; period <= 3; period++) sheet = startYouth(sheet, period);
    sheet = startYouth(sheet, 4, [3, 4, 5, 6, 8, 9]);
    sheet = identifyLiveSheet({
      ...sheet,
      events: [
        {
          id: youthKey(201),
          side: "us",
          cap: 8,
          kind: "red",
          period: 4,
          keeper: null,
          deleted: false,
        },
      ],
    });
    sheet = replaceParticipant(sheet, {
      id: youthKey(202),
      period: 4,
      side: "us",
      incoming: youthKey(2),
      outgoing: youthKey(8),
      reason: "sanction",
      eventId: youthKey(201),
    });
    expect(eligibleForAction({ ...sheet, period: 5 }, "us", 2)).toBe(true);
    expect(eligibleForAction({ ...sheet, period: 5 }, "us", 8)).toBe(false);
  });

  it("permite poner un jugador de campo como portero tras expulsar al único", () => {
    const initial = startYouth(youthSheet("infantil", [1, 2, 3, 4, 5, 6, 7, 8, 9]), 1);
    const sheet = identifyLiveSheet({
      ...initial,
      events: [
        {
          id: youthKey(203),
          side: "us",
          cap: 1,
          kind: "red",
          period: 1,
          keeper: 1,
          deleted: false,
        },
      ],
    });
    const next = identifyLiveSheet(
      replaceParticipant(sheet, {
        id: youthKey(204),
        period: 1,
        side: "us",
        incoming: youthKey(9),
        outgoing: youthKey(1),
        reason: "sanction",
        eventId: youthKey(203),
      }),
    );
    expect(next.keeper).toBe(9);
    expect(sheetSchema.safeParse(next).success).toBe(true);
    expect(outstandingReplacement(next)).toBeNull();
  });
});

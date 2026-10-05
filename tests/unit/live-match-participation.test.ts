import { describe, expect, it } from "vitest";
import { sheetSchema, type LiveSheet } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { editLiveRoster, playerHasRecordedHistory } from "@/lib/domain/live-match-roster-edit";
import {
  controlsParticipation,
  lineupSelectionMessage,
  currentParticipants,
  eligibleForAction,
  outstandingReplacement,
  participantIsPlaying,
  playedPeriods,
  prepareParticipation,
  replaceParticipant,
  rotationAdvice,
  rotationCompletion,
  saveLineups,
  reviseReplacement,
  editOpponentCaps,
} from "@/lib/domain/live-match-participation";
import { exclusionLimit } from "@/lib/domain/live-match-rules";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture(category = "infantil"): LiveSheet {
  return identifyLiveSheet(
    prepareParticipation(
      sheetSchema.parse({
        version: 2,
        players: Array.from({ length: 14 }, (_, i) => ({
          id: id(i + 1),
          cap: i + 1,
          name: `Jugador ${i + 1}`,
        })),
        opponentCaps: Array.from({ length: 14 }, (_, i) => i + 1),
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
function start(sheet: LiveSheet, period: number, field = [2, 3, 4, 5, 6, 7]) {
  return identifyLiveSheet(
    saveLineups(
      { ...sheet, phase: period === 1 ? "ready" : "break", period: Math.max(1, period - 1) },
      ["us", "them"].map((side) => ({
        period,
        side: side as "us" | "them",
        keeper: side === "us" ? id(1) : "1",
        field: field.map((n) => (side === "us" ? id(n) : String(n))),
      })),
      "start",
    ),
  );
}

describe("participación de categorías inferiores", () => {
  it.each([
    ["benjamin", 8],
    ["alevin", 8],
    ["infantil", 9],
  ])("%s exige un mínimo de %i convocados para ambos equipos", (category, minimum) => {
    const sheet = fixture(category as string);
    const size = minimum as number;
    expect(() =>
      editOpponentCaps(
        sheet,
        Array.from({ length: size - 1 }, (_, i) => i + 1),
      ),
    ).toThrow(`mínimo ${size}`);
    expect(() => editLiveRoster(sheet, sheet.players.slice(0, size - 1), [])).toThrow(
      `mínimo ${size}`,
    );
    expect(
      editOpponentCaps(
        sheet,
        Array.from({ length: size }, (_, i) => i + 1),
      ).opponentCaps,
    ).toHaveLength(size);
    expect(
      editLiveRoster(sheet, sheet.players.slice(0, size), []).players.filter((p) => !p.retired),
    ).toHaveLength(size);
  });
  it.each(["benjamin", "alevin", "infantil"])(
    "%s exime automáticamente al único portero del descanso",
    (category) => {
      let sheet = fixture(category);
      sheet = {
        ...sheet,
        players: sheet.players.filter((p) => p.cap !== 13),
        opponentCaps: sheet.opponentCaps.filter((cap) => cap !== 13),
      };
      const field = category === "infantil" ? [2, 3, 4, 5, 6, 7] : [2, 3, 4, 5, 6];
      for (let period = 1; period <= 4; period++) sheet = start(sheet, period, field);
      for (const side of ["us", "them"] as const) {
        const keeper = side === "us" ? id(1) : "1";
        expect(
          rotationAdvice(sheet, side, 4).some((a) => a.key === keeper && a.kind === "rest"),
        ).toBe(false);
        expect(
          rotationCompletion(sheet).some(
            (message) =>
              message.includes(side === "us" ? "Jugador 1:" : "Gorro 1:") &&
              message.includes("sin descansar"),
          ),
        ).toBe(false);
      }
    },
  );
  it("guía según lo que falta en cada equipo y categoría", () => {
    const sheet = fixture("escuela");
    const field = [2, 3, 4, 5, 6].map(id);
    expect(
      lineupSelectionMessage(sheet, {
        period: 1,
        side: "us",
        keeper: id(1),
        field: field.slice(0, 4),
      }),
    ).toContain("Morvedre: falta 1 jugador de campo");
    expect(lineupSelectionMessage(sheet, { period: 1, side: "us", keeper: "", field })).toBe(
      "Morvedre: falta el portero. Elige el gorro 1 o 13.",
    );
    expect(lineupSelectionMessage(sheet, { period: 1, side: "them", keeper: "", field: [] })).toBe(
      "Rival: elige un portero (1 o 13) y 5 jugadores de campo más.",
    );
    expect(
      lineupSelectionMessage(fixture(), { period: 1, side: "us", keeper: id(1), field }),
    ).toContain("falta 1 jugador de campo");
    expect(
      lineupSelectionMessage(sheet, {
        period: 1,
        side: "us",
        keeper: id(1),
        field: [...field, id(7)],
      }),
    ).toContain("sobra 1 jugador de campo");
  });

  it("corrige y anula sustituciones sin añadir participantes duplicados", () => {
    let sheet = start(fixture(), 1);
    sheet = replaceParticipant(sheet, {
      id: id(400),
      period: 1,
      side: "us",
      incoming: id(9),
      outgoing: id(2),
      reason: "injury",
    });
    expect(playedPeriods(sheet, "us", id(9))).toEqual([1]);
    const corrected = reviseReplacement(sheet, id(400), id(10));
    expect(playedPeriods(corrected, "us", id(9))).toEqual([]);
    expect(playedPeriods(corrected, "us", id(10))).toEqual([1]);
    const cancelled = reviseReplacement(corrected, id(400), null);
    expect(currentParticipants(cancelled, "us")?.has(id(2))).toBe(true);
    expect(playedPeriods(cancelled, "us", id(10))).toEqual([]);
    expect(() => reviseReplacement(sheet, id(400), id(3))).toThrow("sustituciones");
    expect(() =>
      saveLineups(
        sheet,
        sheet.participation!.lineups.map((l) =>
          l.side === "us" ? { ...l, field: l.field.map((p) => (p === id(2) ? id(10) : p)) } : l,
        ),
        "correct",
      ),
    ).toThrow("sustitución registrada");
  });
  it("anula un cambio de portero conservando el autor de las jugadas de campo", () => {
    let sheet = start(fixture(), 1);
    sheet = replaceParticipant(sheet, {
      id: id(401),
      period: 1,
      side: "us",
      incoming: id(13),
      outgoing: id(1),
      reason: "injury",
    });
    sheet = identifyLiveSheet(
      {
        ...sheet,
        events: [
          {
            id: id(402),
            side: "us",
            cap: 13,
            kind: "save",
            keeper: null,
            period: 1,
            deleted: false,
          },
        ],
      },
      sheet,
    );
    const revised = identifyLiveSheet(reviseReplacement(sheet, id(401), null), sheet);
    expect(revised).toMatchObject({ keeper: 1 });
    expect(revised.events[0]).toMatchObject({ cap: 1, playerId: id(1) });
    expect(revised.keeperStints).toHaveLength(1);
    expect(playedPeriods(revised, "us", id(13))).toEqual([]);
  });
  it("no elimina gorros rivales con participación aunque no tengan estadísticas", () => {
    const sheet = start(fixture(), 1);
    expect(() =>
      editOpponentCaps(
        sheet,
        sheet.opponentCaps.filter((cap) => cap !== 2),
      ),
    ).toThrow("participación");
    const revised = editOpponentCaps(
      sheet,
      sheet.opponentCaps.filter((cap) => cap !== 9),
    );
    expect(revised.opponentCaps).not.toContain(9);
    expect(editOpponentCaps(revised, [...revised.opponentCaps, 9]).opponentCaps).toContain(9);
  });
  it("el portero único confirmado de Alevín queda exento de descansar", () => {
    let sheet = fixture("alevin");
    sheet = {
      ...sheet,
      players: sheet.players.filter((p) => p.cap !== 13),
      participation: { ...sheet.participation!, fixedKeepers: { us: id(1), them: null } },
    };
    for (const p of [1, 2, 3]) sheet = start(sheet, p, [2, 3, 4, 5, 6]);
    expect(rotationAdvice(sheet, "us", 4).some((a) => a.key === id(1) && a.kind === "rest")).toBe(
      false,
    );
    expect(rotationAdvice(sheet, "them", 4).some((a) => a.key === "1" && a.kind === "rest")).toBe(
      true,
    );
  });
  it.each(["alevin", "benjamin", "escuela"])(
    "%s pide cinco jugadores de campo y un portero",
    (category) => {
      expect(() => start(fixture(category), 1)).toThrow("5 jugadores");
      expect(start(fixture(category), 1, [2, 3, 4, 5, 6]).phase).toBe("playing");
    },
  );
  it("anticipa una falta de plazas de campo aunque queden plazas de portería", () => {
    let sheet = fixture("alevin");
    for (const period of [1, 2]) sheet = start(sheet, period, [2, 3, 4, 5, 6]);
    const proposed = {
      period: 3,
      side: "us" as const,
      keeper: id(13),
      field: [2, 3, 4, 5, 6].map(id),
    };
    expect(rotationAdvice(sheet, "us", 3, proposed).some((a) => a.key === "capacity")).toBe(true);
  });
  it.each(["us", "them"] as const)(
    "explica la falta de plazas y el descanso del equipo %s sin llamarlo falta de datos",
    (side) => {
      let sheet = fixture("benjamin");
      for (const period of [1, 2]) sheet = start(sheet, period, [2, 3, 4, 5, 6]);
      const proposed = {
        period: 3,
        side,
        keeper: side === "us" ? id(1) : "1",
        field: [2, 3, 4, 5, 6].map((n) => (side === "us" ? id(n) : String(n))),
      };
      const warnings = rotationAdvice(sheet, side, 3, proposed);
      const capacity = warnings.find((a) => a.kind === "capacity");
      expect(capacity?.message).toContain(`${side === "us" ? "Morvedre" : "Rival"}:`);
      expect(capacity?.message).toContain(
        "7 jugadores de campo sin haber jugado y solo 5 plazas en el cuarto 4",
      );
      expect(capacity?.message).toContain("Al menos 2 jugadores no podrían cumplir");
      expect(capacity?.message).toContain("6 jugadores habrían jugado los cuartos 1, 2 y 3");
      expect(capacity?.message).toContain("deberían descansar en el cuarto 4");
      expect(warnings.some((a) => a.kind === "missing")).toBe(false);
    },
  );
  it("no avisa de falta de plazas si los pendientes caben y distingue las plazas de portero", () => {
    let sheet = fixture("benjamin");
    for (const period of [1, 2]) sheet = start(sheet, period, [2, 3, 4, 5, 6]);
    const proposed = {
      period: 3,
      side: "us" as const,
      keeper: id(13),
      field: [7, 8, 9, 10, 11].map(id),
    };
    expect(rotationAdvice(sheet, "us", 3, proposed).some((a) => a.kind === "capacity")).toBe(false);
    sheet = start(sheet, 3, [2, 3, 4, 5, 6]);
    const capacity = rotationAdvice(sheet, "us", 4, { ...proposed, period: 4, keeper: id(1) }).find(
      (a) => a.kind === "capacity",
    );
    expect(capacity?.message).toContain(
      "1 portero terminaría los cuatro primeros cuartos sin jugar",
    );
  });
  it("corrige un portero de un cuarto anterior con su identidad y sin cambiar el cuarto actual", () => {
    let sheet = start(fixture(), 1);
    sheet = identifyLiveSheet({
      ...sheet,
      events: [
        { id: id(301), side: "us", cap: 1, kind: "save", period: 1, keeper: null, deleted: false },
      ],
    });
    sheet = start(sheet, 2);
    const corrected = identifyLiveSheet(
      saveLineups(
        sheet,
        sheet
          .participation!.lineups.filter((l) => l.period === 1)
          .map((l) => (l.side === "us" ? { ...l, keeper: id(13) } : l)),
        "correct",
      ),
      sheet,
    );
    expect(corrected.events[0]).toMatchObject({ cap: 13, playerId: id(13) });
    expect(corrected).toMatchObject({ period: 2, keeper: 1 });
    expect(sheetSchema.safeParse(corrected).success).toBe(true);
  });
  it("no altera las categorías superiores ni las actas cerradas", () => {
    const sheet = {
      ...fixture(),
      category: "cadete" as const,
      participation: undefined,
      version: 3 as const,
    };
    expect(prepareParticipation(sheet, "cadete")).toBe(sheet);
    expect(controlsParticipation(sheet)).toBe(false);
    expect(
      prepareParticipation({ ...sheet, phase: "finished" }, "infantil").participation,
    ).toBeUndefined();
  });
  it("guarda el comienzo con ambos equipos y limita asistentes/lanzadores a quienes juegan", () => {
    const sheet = start(fixture(), 1);
    expect(sheet.phase).toBe("playing");
    expect(sheet.keeperStints?.[0].playerId).toBe(id(1));
    expect(participantIsPlaying(sheet, "us", 9)).toBe(false);
    expect(eligibleForAction(sheet, "us", 2)).toBe(true);
    expect(eligibleForAction(sheet, "them", 9)).toBe(false);
    expect(sheetSchema.safeParse(sheet).success).toBe(true);
    expect(() => saveLineups(sheet, sheet.participation!.lineups, "start")).toThrow(
      "ya ha empezado",
    );
  });
  it("avisa al preparar el cuarto 4 sin impedir seleccionar a quienes deben descansar", () => {
    let sheet = fixture();
    for (const p of [1, 2, 3]) sheet = start(sheet, p);
    const advice = rotationAdvice(sheet, "us", 4);
    expect(advice.find((a) => a.key === id(2))?.kind).toBe("rest");
    expect(advice.find((a) => a.key === id(9))?.kind).toBe("play");
    expect(rotationAdvice(sheet, "them", 4).find((a) => a.key === "9")?.kind).toBe("play");
    sheet = start(sheet, 4);
    expect(playedPeriods(sheet, "us", id(2))).toEqual([1, 2, 3, 4]);
    expect(controlsParticipation({ ...sheet, period: 5 })).toBe(false);
    expect(eligibleForAction({ ...sheet, period: 5 }, "us", 9)).toBe(true);
  });
  it("no confunde los cuartos sin datos con descanso", () => {
    const sheet = start(fixture(), 3);
    expect(rotationAdvice(sheet, "us", 4).some((a) => a.kind === "missing")).toBe(true);
    expect(rotationAdvice(sheet, "us", 4).some((a) => a.kind === "play")).toBe(false);
  });
  it("mantiene la participación con el jugador al intercambiar gorros y trasladar un nombre erróneo", () => {
    const sheet = start(fixture(), 1);
    expect(playerHasRecordedHistory(sheet, id(2))).toBe(true);
    expect(() =>
      editLiveRoster(
        sheet,
        sheet.players.filter((p) => p.id !== id(2)),
        [],
      ),
    ).toThrow("acciones");
    const swapped = editLiveRoster(
      sheet,
      sheet.players.map((p) => ({ ...p, cap: p.cap === 2 ? 9 : p.cap === 9 ? 2 : p.cap })),
      [],
    );
    expect(participantIsPlaying(swapped, "us", 9)).toBe(true);
    expect(participantIsPlaying(swapped, "us", 2)).toBe(false);
    const replacement = editLiveRoster(
      sheet,
      sheet.players.map((p) => (p.id === id(2) ? { ...p, id: id(20), name: "Correcto" } : p)),
      [{ fromPlayerId: id(2), toPlayerId: id(20) }],
    );
    expect(playedPeriods(replacement, "us", id(20))).toEqual([1]);
    expect(playedPeriods(replacement, "us", id(2))).toEqual([]);
  });
  it("libera la participación desde el quinto y retira el cambio al anular la sanción", () => {
    let sheet = fixture();
    sheet = start(sheet, 1, [2, 3, 4, 5, 6, 9]);
    sheet = start(sheet, 2, [2, 3, 4, 5, 6, 9]);
    sheet = start(sheet, 3, [2, 3, 4, 5, 6, 9]);
    sheet = start(sheet, 4);
    sheet = identifyLiveSheet({
      ...sheet,
      events: [1, 2, 3].map((n) => ({
        id: id(100 + n),
        side: "us",
        cap: 2,
        kind: "exclusion",
        period: 4,
        keeper: null,
        deleted: false,
      })),
    });
    const required = outstandingReplacement(sheet)!;
    expect(required.key).toBe(id(2));
    sheet = replaceParticipant(sheet, {
      id: id(200),
      period: 4,
      side: "us",
      incoming: id(9),
      outgoing: id(2),
      reason: "sanction",
      eventId: required.eventId,
    });
    expect(outstandingReplacement(sheet)).toBeNull();
    expect(currentParticipants(sheet, "us")?.has(id(2))).toBe(false);
    expect(playedPeriods(sheet, "us", id(2))).toEqual([1, 2, 3, 4]);
    expect(eligibleForAction({ ...sheet, period: 5 }, "us", 9)).toBe(true);
    sheet = {
      ...sheet,
      events: sheet.events.map((e) => (e.id === required.eventId ? { ...e, deleted: true } : e)),
    };
    expect(playedPeriods(sheet, "us", id(9))).toEqual([1, 2, 3]);
  });
  it("aplica cuatro expulsiones solo al formato Benjamín/Escuela", () => {
    for (const category of ["benjamin", "escuela", "alevin"]) {
      const sheet = fixture(category);
      const withFour = {
        ...sheet,
        baseline: [{ cap: 2, playerId: id(2), goals: 0, exclusions: 4 }],
      };
      expect(exclusionLimit(sheet)).toBe(category === "alevin" ? 3 : 4);
      expect(sheetSchema.safeParse(withFour).success).toBe(category !== "alevin");
    }
  });
  it("no permite referencias inexistentes ni alineaciones duplicadas", () => {
    const sheet = start(fixture(), 1);
    expect(
      sheetSchema.safeParse({
        ...sheet,
        participation: {
          ...sheet.participation,
          lineups: [...sheet.participation!.lineups, sheet.participation!.lineups[0]],
        },
      }).success,
    ).toBe(false);
    expect(
      sheetSchema.safeParse({
        ...sheet,
        participation: { ...sheet.participation, fixedKeepers: { us: id(90), them: null } },
      }).success,
    ).toBe(false);
  });
});

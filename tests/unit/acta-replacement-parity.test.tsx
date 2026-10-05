import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { youthSheet } from "../fixtures/youth-acta";
import { sheetSchema, type LiveSheet, type Side } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import {
  currentParticipants,
  currentKeeperKey,
  fieldPlayersNeeded,
  keeperOptions,
  outstandingReplacement,
  replacementCandidates,
  replaceParticipant,
  reviseReplacement,
  saveLineups,
} from "@/lib/domain/live-match-participation";
import { ActaParticipationReplacement } from "@/components/matches/acta-participation-replacement";
import { keeperQuarters } from "@/lib/domain/live-match-keepers";

function fixture(single = true) {
  localStorage.clear();
  let sheet = youthSheet();
  if (single)
    sheet = {
      ...sheet,
      players: sheet.players.filter((p) => p.cap !== 13),
      opponentCaps: sheet.opponentCaps.filter((cap) => cap !== 13),
    };
  const key = (side: Side, cap: number) =>
    side === "us" ? sheet.players.find((p) => p.cap === cap)!.id : String(cap);
  sheet = identifyLiveSheet(
    saveLineups(
      sheet,
      (["us", "them"] as const).map((side) => ({
        side,
        period: 1,
        keeper: key(side, 1),
        field: [2, 3, 4, 5, 6, 7].map((cap) => key(side, cap)),
      })),
      "start",
    ),
  );
  return { sheet, key };
}
function red(sheet: LiveSheet, side: Side, cap: number) {
  return identifyLiveSheet({
    ...sheet,
    events: [
      ...sheet.events,
      {
        id: crypto.randomUUID(),
        side,
        cap,
        kind: "red",
        period: sheet.period,
        keeper: sheet.keeper,
        deleted: false,
      },
    ],
  });
}
function replace(sheet: LiveSheet, incoming: string) {
  const required = outstandingReplacement(sheet)!;
  return identifyLiveSheet(
    replaceParticipant(sheet, {
      id: crypto.randomUUID(),
      period: sheet.period,
      side: required.side,
      incoming,
      outgoing: required.key,
      reason: "sanction",
      eventId: required.eventId,
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());

it.each(["us", "them"] as const)(
  "permite un jugador de campo como portero tras expulsar al único: %s",
  (side) => {
    const { sheet: original, key } = fixture();
    const sheet = red(original, side, 1);
    expect(replacementCandidates(sheet, side, key(side, 1)).some((p) => p.cap === 9)).toBe(true);
    const next = replace(sheet, key(side, 9));
    expect(currentKeeperKey(next, side)).toBe(key(side, 9));
    expect(currentParticipants(next, side)?.has(key(side, 1))).toBe(false);
    expect(outstandingReplacement(next)).toBeNull();
    expect(keeperOptions(next, side).some((p) => p.cap === 9)).toBe(true);
    if (side === "us") {
      expect(next.keeper).toBe(9);
      expect(keeperQuarters(next, 9)).toEqual([1]);
    }
    expect(sheetSchema.safeParse(next).success).toBe(true);
  },
);

it("permite que un jugador ya en el agua se ponga de portero, quedando uno menos", () => {
  const { sheet: original, key } = fixture();
  const next = replace(red(original, "us", 1), key("us", 2));
  expect(currentParticipants(next, "us")?.size).toBe(6);
  expect(next.keeper).toBe(2);
  expect(sheetSchema.safeParse(next).success).toBe(true);
  const lineups = (["us", "them"] as const).map((side) => ({
    side,
    period: 2,
    keeper: key(side, side === "us" ? 2 : 1),
    field: (side === "us" ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5, 6, 7]).map((cap) => key(side, cap)),
  }));
  expect(saveLineups({ ...next, phase: "break" }, lineups, "start").keeper).toBe(2);
  const corrected = reviseReplacement(next, next.participation!.changes[0].id, key("us", 9));
  expect(corrected.keeper).toBe(9);
});

it("si queda otro portero disponible, ofrece ese portero", () => {
  const { sheet: original, key } = fixture(false);
  expect(
    replacementCandidates(red(original, "us", 1), "us", key("us", 1)).map((p) => p.cap),
  ).toEqual([13]);
});

it("sin sustitutos disponibles no exige un cambio y conserva las sanciones", () => {
  const { sheet: original } = fixture();
  let sheet = original;
  for (const cap of [2, 8, 9, 10, 11, 12, 14]) sheet = red(sheet, "us", cap);
  expect(outstandingReplacement(sheet)).toBeNull();
  expect(fieldPlayersNeeded(sheet, "us", 2)).toBe(5);
  const key = (side: Side, cap: number) =>
    side === "us" ? sheet.players.find((p) => p.cap === cap)!.id : String(cap);
  const lineups = (["us", "them"] as const).map((side) => ({
    side,
    period: 2,
    keeper: key(side, 1),
    field: (side === "us" ? [3, 4, 5, 6, 7] : [2, 3, 4, 5, 6, 7]).map((cap) => key(side, cap)),
  }));
  const next = saveLineups({ ...sheet, phase: "break" }, lineups, "start");
  expect(
    next.participation!.lineups.find((lineup) => lineup.side === "us" && lineup.period === 2)
      ?.incident,
  ).toContain("menos jugadores");
});

it("el selector obligatorio y su confirmación no permiten cerrarse con Escape", async () => {
  const { sheet: original } = fixture();
  const sheet = red(original, "us", 2);
  const onClose = vi.fn();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const mount = document.createElement("div");
  document.body.append(mount);
  const root = createRoot(mount);
  try {
    await act(async () =>
      root.render(
        createElement(ActaParticipationReplacement, {
          sheet,
          required: outstandingReplacement(sheet),
          change: vi.fn(async () => true),
          onClose,
          busy: false,
        }),
      ),
    );
    expect(document.querySelector('button[aria-label="Cerrar aviso"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Elegir después");
    await act(async () =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const candidate = document.querySelector<HTMLButtonElement>('button[aria-label^="9 "]')!;
    await act(async () => candidate.click());
    await act(async () =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Confirmar sustitución");
    expect(document.querySelector('button[aria-label="Cerrar aviso"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    mount.remove();
  }
});

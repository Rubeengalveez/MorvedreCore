import { describe, expect, it } from "vitest";
import { sheetSchema, type LiveSheet, type Side } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { exclusionLimit, matchRules } from "@/lib/domain/live-match-rules";
import {
  currentParticipants,
  outstandingReplacement,
  participantKey,
  prepareParticipation,
  replaceParticipant,
  saveLineups,
} from "@/lib/domain/live-match-participation";

function fixture(category: string, period: number) {
  let sheet = identifyLiveSheet(
    prepareParticipation(
      sheetSchema.parse({
        version: 2,
        players: Array.from({ length: 14 }, (_, i) => ({
          id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
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
  sheet = saveLineups(
    sheet,
    (["us", "them"] as const).map((side) => ({
      side,
      period: 1,
      keeper: participantKey(sheet, side, 1),
      field: Array.from({ length: matchRules(category).fieldPlayers }, (_, i) =>
        participantKey(sheet, side, i + 2),
      ),
    })),
    "start",
  );
  return {
    ...sheet,
    period,
    participation: {
      ...sheet.participation!,
      lineups: sheet.participation!.lineups.map((lineup) => ({
        ...lineup,
        period: Math.min(period, 4),
      })),
    },
  };
}

function sanction(
  sheet: LiveSheet,
  side: Side,
  kind: "red" | "exclusion",
  cap = 2,
  count = 1,
): LiveSheet {
  return {
    ...sheet,
    events: Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      side,
      cap,
      kind,
      period: sheet.period,
      keeper: 1,
      deleted: false,
    })),
  };
}

describe.each(["benjamin", "alevin", "infantil"])("sustitución obligatoria en %s", (category) => {
  it.each(
    [1, 2, 3, 4].flatMap((period) =>
      (["us", "them"] as Side[]).flatMap((side) =>
        (["red", "exclusion"] as const).map((kind) => ({ period, side, kind })),
      ),
    ),
  )("cuarto $period, $side, $kind: sustituye al jugador en el agua", ({ period, side, kind }) => {
    const initial = fixture(category, period);
    const sheet = sanction(initial, side, kind, 2, kind === "red" ? 1 : exclusionLimit(initial));
    const required = outstandingReplacement(sheet);
    expect(required).toMatchObject({ side, cap: 2, key: participantKey(sheet, side, 2) });
    const next = replaceParticipant(sheet, {
      id: crypto.randomUUID(),
      period,
      side,
      outgoing: required!.key,
      incoming: participantKey(sheet, side, 8),
      reason: "sanction",
      eventId: required!.eventId,
    });
    expect(currentParticipants(next, side)?.has(participantKey(next, side, 2))).toBe(false);
    expect(currentParticipants(next, side)?.has(participantKey(next, side, 8))).toBe(true);
    expect(currentParticipants(next, side)?.size).toBe(matchRules(category).fieldPlayers + 1);
    expect(outstandingReplacement(next)).toBeNull();
  });

  it("no sustituye antes del límite ni a un jugador que no está en el agua", () => {
    const sheet = fixture(category, 4);
    expect(
      outstandingReplacement(sanction(sheet, "us", "exclusion", 2, exclusionLimit(sheet) - 1)),
    ).toBeNull();
    expect(outstandingReplacement(sanction(sheet, "us", "red", 9))).toBeNull();
    expect(outstandingReplacement({ ...sanction(sheet, "us", "red"), phase: "break" })).toBeNull();
  });

  it.each([5, 6])("no exige esta sustitución controlada en el cuarto %i", (period) => {
    expect(outstandingReplacement(sanction(fixture(category, period), "us", "red"))).toBeNull();
  });

  it("si no quedan sustitutos disponibles permite seguir sin un jugador", () => {
    const initial = fixture(category, 4);
    const playing = currentParticipants(initial, "us")!;
    const caps = initial.players
      .filter((p) => !playing.has(p.id) && ![1, 13].includes(p.cap))
      .map((p) => p.cap);
    const sheet = sanction(initial, "us", "red");
    for (const cap of caps) sheet.events.push(...sanction(initial, "us", "red", cap).events);
    expect(outstandingReplacement(sheet)).toBeNull();
  });
});

it.each(["cadete", "juvenil", "absoluto"])("mantiene el comportamiento de %s", (category) => {
  const sheet = sanction(fixture("infantil", 1), "us", "red");
  expect(
    outstandingReplacement({ ...sheet, category: category as LiveSheet["category"] }),
  ).toBeNull();
});

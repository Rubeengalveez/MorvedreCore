import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { createActaPdf } from "../../lib/domain/acta-pdf";
import type { LiveRecord, MatchEvent } from "../../lib/domain/live-match";

const players = Array.from({ length: 14 }, (_, index) => ({
  id: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000001`,
  cap: index + 1,
  name: ["Álex García", "Marcos Ruiz", "Pablo Martínez", "Javier López", "Hugo Pérez", "Sergio Gómez", "Lucas Sánchez", "Mateo Fernández", "Daniel Torres", "Adrián Navarro", "Diego Romero", "Bruno Molina", "Iván Ortiz", "Leo Castillo"][index],
}));
const event = (index: number, kind: MatchEvent["kind"], values: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `${String(index + 30).padStart(8, "0")}-0000-4000-8000-000000000001`,
  side: "us",
  cap: 2,
  kind,
  period: index < 8 ? 1 : index < 15 ? 2 : index < 22 ? 3 : 4,
  keeper: null,
  deleted: false,
  origin: "manual",
  related_event_id: null,
  ...values,
});

it("genera un informe multipágina con orientaciones mixtas y todos los datos", async () => {
  const goal = event(1, "goal");
  const rivalPenalty = event(11, "penalty", { side: "them", cap: 7 });
  const record: LiveRecord = {
    matchId: "99999999-0000-4000-8000-000000000001",
    owner: players[0].id,
    viewer: players[0].id,
    canEdit: true,
    opponent: "Club Waterpolo Turia",
    team: "Infantil Mixto",
    date: "2026-09-08T16:00:00.000Z",
    competition: "Liga autonómica",
    venue: "Piscina Internúcleos",
    homeAway: "home",
    revision: 8,
    mutation: "88888888-0000-4000-8000-000000000001",
    device: "77777777-0000-4000-8000-000000000001",
    dirty: false,
    sheet: {
      version: 2,
      players,
      opponentCaps: Array.from({ length: 14 }, (_, index) => index + 1),
      periods: 4,
      period: 4,
      phase: "finished",
      keeper: 13,
      baseline: players.map((player) => ({ cap: player.cap, goals: 0, exclusions: 0 })),
      baselineThem: 0,
      pending: null,
      events: [
        goal,
        event(2, "assist", { cap: 6, related_event_id: goal.id, origin: "goal_flow" }),
        event(3, "goal_extra", { cap: 4 }),
        event(4, "shot_out", { cap: 5 }),
        event(5, "shot_blocked", { cap: 7 }),
        event(6, "shot_corner", { cap: 8 }),
        event(7, "exclusion", { cap: 9 }),
        event(8, "goal", { side: "them", cap: 3, keeper: 1 }),
        event(9, "save", { cap: 1 }),
        event(10, "penalty_save", { cap: 1 }),
        rivalPenalty,
        event(12, "goal_penalty", { cap: 10, related_event_id: rivalPenalty.id, origin: "penalty_flow" }),
        event(13, "timeout", { side: "us", cap: null }),
        event(14, "coach_yellow", { side: "them", cap: null }),
        event(15, "goal", { cap: 3 }),
        event(16, "goal", { side: "them", cap: 5, keeper: 13 }),
        event(17, "save", { cap: 13 }),
        event(18, "exclusion", { cap: 9 }),
        event(19, "penalty_missed", { cap: 11 }),
        event(20, "goal_extra", { cap: 12 }),
        event(21, "timeout", { side: "them", cap: null }),
        event(22, "goal", { side: "them", cap: 7, keeper: 13 }),
        event(23, "exclusion", { cap: 9 }),
        event(24, "red", { cap: 14 }),
        event(25, "goal", { cap: 2 }),
        event(26, "goal", { side: "them", cap: 7, keeper: 13 }),
      ],
    },
  };
  const file = createActaPdf(record);
  expect(file.size).toBeGreaterThan(10_000);
  expect(file.name).toBe("acta-2026-09-08-infantil-mixto-club-waterpolo-turia.pdf");
  const source = Buffer.from(await file.arrayBuffer()).toString("latin1");
  if (process.env.ACTA_PDF_PREVIEW) {
    await writeFile(process.env.ACTA_PDF_PREVIEW, Buffer.from(await file.arrayBuffer()));
  }
  expect(source).toMatch(/^%PDF-/);
  expect(source.match(/\/Type \/Page\b/g)?.length).toBeGreaterThanOrEqual(3);
  expect(source).toMatch(/\/MediaBox \[0 0 841\.\d+ 595\.\d+\]/);
  expect(source).toMatch(/\/MediaBox \[0 0 595\.\d+ 841\.\d+\]/);

  const provisional = createActaPdf({
    ...record,
    opponent: "Club con un nombre especialmente largo para probar la maquetación",
    dirty: true,
    sheet: {
      ...record.sheet,
      periods: 6,
      period: 1,
      phase: "playing",
      events: [],
    },
  });
  expect(provisional.size).toBeGreaterThan(8_000);

  const extraPlayers = Array.from({ length: 4 }, (_, index) => ({
    id: `${String(index + 70).padStart(8, "0")}-0000-4000-8000-000000000001`,
    cap: index + 15,
    name: `Jugador histórico con nombre largo ${index + 15}`,
  }));
  const historical = createActaPdf({
    ...record,
    sheet: {
      ...record.sheet,
      players: [...record.sheet.players, ...extraPlayers],
      baseline: [
        ...record.sheet.baseline,
        ...extraPlayers.map((player) => ({ cap: player.cap, goals: 1, exclusions: 0 })),
      ],
    },
  });
  const historicalSource = Buffer.from(await historical.arrayBuffer()).toString("latin1");
  expect(historicalSource.match(/\/Type \/Page\b/g)?.length).toBeGreaterThanOrEqual(4);
});

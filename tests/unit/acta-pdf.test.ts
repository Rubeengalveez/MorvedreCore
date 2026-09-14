import { describe, it, expect } from "vitest";
import { createActaPdf } from "@/lib/domain/acta-pdf";
import type { LiveRecord, LiveSheet, MatchEvent } from "@/lib/domain/live-match";

function testSheet(): LiveSheet {
  const events: MatchEvent[] = [
    {
      id: "ev-1",
      side: "us",
      cap: 4,
      kind: "goal",
      period: 1,
      keeper: null,
      deleted: false,
    },
    {
      id: "ev-2",
      side: "us",
      cap: 7,
      kind: "assist",
      period: 1,
      related_event_id: "ev-1",
      keeper: null,
      deleted: false,
    },
    {
      id: "ev-3",
      side: "them",
      cap: 9,
      kind: "exclusion",
      period: 1,
      keeper: null,
      deleted: false,
    },
    {
      id: "ev-4",
      side: "us",
      cap: 4,
      kind: "goal_extra",
      period: 1,
      keeper: null,
      deleted: false,
    },
    {
      id: "ev-5",
      side: "them",
      cap: 5,
      kind: "goal",
      period: 2,
      keeper: 1,
      deleted: false,
    },
    {
      id: "ev-6",
      side: "us",
      cap: 1,
      kind: "save",
      period: 2,
      keeper: 1,
      deleted: false,
    },
    {
      id: "ev-7",
      side: "them",
      cap: 3,
      kind: "penalty",
      period: 3,
      keeper: null,
      deleted: false,
    },
    {
      id: "ev-8",
      side: "us",
      cap: 2,
      kind: "goal_penalty",
      period: 3,
      keeper: null,
      deleted: false,
    },
  ];

  return {
    version: 1,
    players: [
      { id: "p-1", cap: 1, name: "Marc Portero" },
      { id: "p-2", cap: 2, name: "David Capitán" },
      { id: "p-3", cap: 4, name: "Lucía Goleadora" },
      { id: "p-4", cap: 7, name: "Carlos Asistente" },
      { id: "p-5", cap: 8, name: "Hugo SinAcciones" },
    ],
    opponentCaps: [1, 3, 5, 9],
    periods: 4,
    period: 4,
    phase: "finished",
    keeper: 1,
    events,
    baseline: [],
    baselineThem: 0,
  };
}

function testRecord(sheet = testSheet()): LiveRecord {
  return {
    matchId: "m-123456",
    owner: "user-1",
    viewer: "user-1",
    canEdit: true,
    opponent: "CW Castellón",
    team: "Cadete B",
    date: "2026-09-14T18:00:00Z",
    competition: "league",
    venue: "Piscina Municipal Puerto Sagunto",
    homeAway: "home",
    revision: 1,
    mutation: "done",
    device: "mobile-1",
    sheet,
    dirty: false,
  };
}

describe("createActaPdf", () => {
  it("genera un PDF válido sin errores con acta horizontal y análisis vertical", async () => {
    const record = testRecord();
    const pdfFile = createActaPdf(record);

    expect(pdfFile).toBeDefined();
    expect(pdfFile.name).toContain("acta-2026-09-14-cadete-b-cw-castellon.pdf");
    expect(pdfFile.type).toBe("application/pdf");
    expect(pdfFile.size).toBeGreaterThan(1000);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfString = buffer.toString("latin1");
    expect(pdfString.startsWith("%PDF-")).toBe(true);
    const boxes = [...pdfString.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)];
    expect(boxes).toHaveLength(4);
    expect(Number(boxes[0][1])).toBeGreaterThan(Number(boxes[0][2]));
    expect(Number(boxes[1][1])).toBeLessThan(Number(boxes[1][2]));
    expect(pdfString).toContain("MORVEDRE");
    expect(pdfString).toContain("CW Castell");
  });

  it("gestiona actas vacías o sin eventos sin lanzar excepciones", () => {
    const emptySheet: LiveSheet = {
      version: 1,
      players: [{ id: "p-1", cap: 1, name: "Portero Solo" }],
      opponentCaps: [1, 2],
      periods: 4,
      period: 1,
      phase: "ready",
      keeper: 1,
      events: [],
      baseline: [],
      baselineThem: 0,
    };
    const record = testRecord(emptySheet);
    const pdfFile = createActaPdf(record);
    expect(pdfFile.size).toBeGreaterThan(500);
  });

  it("genera el acta completa con 13 jugadores, comparativa de expulsiones y analítica individual", async () => {
    const sheet: LiveSheet = {
      version: 1,
      players: [
        { id: "p-1", cap: 1, name: "Leo Ruiz Torres" },
        { id: "p-2", cap: 2, name: "Pau Pérez Méndez" },
        { id: "p-3", cap: 3, name: "Arnau Crespo Díaz" },
        { id: "p-4", cap: 4, name: "Biel Carmona Muñoz" },
        { id: "p-5", cap: 5, name: "Arnau Solà Díaz" },
        { id: "p-6", cap: 6, name: "Eneko Ibarra Muñoz" },
        { id: "p-7", cap: 7, name: "Rayan Martínez Méndez" },
        { id: "p-8", cap: 8, name: "Oliver Torres Domínguez" },
        { id: "p-9", cap: 9, name: "Saúl Rojas Vázquez" },
        { id: "p-10", cap: 10, name: "Jan Vallès García" },
        { id: "p-11", cap: 11, name: "Liam Gallego Serrano" },
        { id: "p-12", cap: 12, name: "Izan Ruiz Méndez" },
        { id: "p-13", cap: 13, name: "Asier Rojas Prieto" },
      ],
      opponentCaps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      periods: 4,
      period: 4,
      phase: "finished",
      keeper: 1,
      events: [
        { id: "e-1", side: "us", cap: 2, kind: "goal", period: 1, keeper: null, deleted: false },
        { id: "e-2", side: "us", cap: 2, kind: "goal", period: 1, keeper: null, deleted: false },
        { id: "e-3", side: "them", cap: 6, kind: "goal", period: 1, keeper: 1, deleted: false },
        { id: "e-4", side: "them", cap: 6, kind: "goal", period: 1, keeper: 1, deleted: false },
        { id: "e-5", side: "us", cap: 3, kind: "goal", period: 1, keeper: null, deleted: false },
        { id: "e-6", side: "us", cap: 5, kind: "goal", period: 2, keeper: null, deleted: false },
        { id: "e-7", side: "us", cap: 5, kind: "goal", period: 2, keeper: null, deleted: false },
        { id: "e-8", side: "us", cap: 6, kind: "goal", period: 3, keeper: null, deleted: false },
        {
          id: "e-9",
          side: "us",
          cap: 6,
          kind: "goal_extra",
          period: 3,
          keeper: null,
          deleted: false,
        },
        { id: "e-10", side: "them", cap: 8, kind: "goal", period: 3, keeper: 10, deleted: false },
        { id: "e-11", side: "them", cap: 6, kind: "goal", period: 3, keeper: 10, deleted: false },
        { id: "e-12", side: "them", cap: 2, kind: "goal", period: 3, keeper: 10, deleted: false },
        { id: "e-13", side: "them", cap: 4, kind: "goal", period: 3, keeper: 10, deleted: false },
        { id: "e-14", side: "them", cap: 5, kind: "goal", period: 3, keeper: 10, deleted: false },
        { id: "e-15", side: "them", cap: 12, kind: "goal", period: 3, keeper: 10, deleted: false },
        { id: "e-16", side: "them", cap: 13, kind: "goal", period: 3, keeper: 10, deleted: false },
        {
          id: "e-17",
          side: "us",
          cap: 4,
          kind: "goal_penalty",
          period: 4,
          keeper: null,
          deleted: false,
        },
        { id: "e-18", side: "us", cap: 7, kind: "goal", period: 4, keeper: null, deleted: false },
        { id: "e-19", side: "us", cap: 12, kind: "goal", period: 4, keeper: null, deleted: false },
        {
          id: "e-20",
          side: "them",
          cap: 4,
          kind: "exclusion",
          period: 1,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-21",
          side: "them",
          cap: 4,
          kind: "exclusion",
          period: 2,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-22",
          side: "them",
          cap: 4,
          kind: "exclusion",
          period: 4,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-23",
          side: "them",
          cap: 2,
          kind: "exclusion",
          period: 1,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-24",
          side: "them",
          cap: 3,
          kind: "exclusion",
          period: 2,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-25",
          side: "them",
          cap: 7,
          kind: "exclusion",
          period: 3,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-26",
          side: "us",
          cap: 3,
          kind: "exclusion",
          period: 1,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-27",
          side: "us",
          cap: 4,
          kind: "exclusion",
          period: 2,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-28",
          side: "us",
          cap: 5,
          kind: "exclusion",
          period: 3,
          keeper: null,
          deleted: false,
        },
        {
          id: "e-29",
          side: "us",
          cap: 5,
          kind: "exclusion",
          period: 4,
          keeper: null,
          deleted: false,
        },
        { id: "e-30", side: "us", cap: 1, kind: "save", period: 1, keeper: 1, deleted: false },
        { id: "e-31", side: "us", cap: 1, kind: "save", period: 1, keeper: 1, deleted: false },
        {
          id: "e-32",
          side: "us",
          cap: 1,
          kind: "penalty_save",
          period: 1,
          keeper: 1,
          deleted: false,
        },
      ],
      baseline: [],
      baselineThem: 0,
    };

    const record: LiveRecord = {
      matchId: "m-full-test",
      owner: "user-1",
      viewer: "user-1",
      canEdit: true,
      opponent: "CW Castellón",
      team: "Cadete B",
      date: "2026-09-13T12:00:00Z",
      competition: "league",
      venue: "Piscina 25m",
      homeAway: "home",
      revision: 77,
      mutation: "done",
      device: "mobile-1",
      sheet,
      dirty: false,
    };

    const pdfFile = createActaPdf(record);
    expect(pdfFile).toBeDefined();
    expect(pdfFile.size).toBeGreaterThan(1500);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfString = buffer.toString("latin1");
    expect(pdfString).toContain("Nuestro equipo");
    expect(pdfString).not.toContain("(LOCAL/VISITANTE)");
    expect(pdfString).toContain("CW Castell");
    expect(pdfString).toContain("Resultado por cuartos");
    expect(pdfString).toContain("Nuestra porter");
    expect(pdfString).toContain("GOLES DE 1+");
    expect(pdfString).toContain("Expulsiones");
    expect(pdfString).toContain("Asistencias");
    expect(pdfString).toContain("Oliver Torres Dom");
  });
});

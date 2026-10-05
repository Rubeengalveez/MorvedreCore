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
  it("integra la eficacia rival en inferioridad antes de los lanzamientos y su G. 1+ en la tabla rival", async () => {
    const sheet = testSheet();
    sheet.events.push(
      {
        id: "own-exclusion-1",
        kind: "exclusion",
        side: "us",
        cap: 4,
        period: 1,
        keeper: null,
        deleted: false,
      },
      {
        id: "own-exclusion-2",
        kind: "exclusion",
        side: "us",
        cap: 7,
        period: 1,
        keeper: null,
        deleted: false,
      },
      {
        id: "rival-extra",
        kind: "goal_extra",
        side: "them",
        cap: 5,
        period: 1,
        keeper: 1,
        deleted: false,
      },
    );
    const source = await createActaPdf(testRecord(sheet)).text();
    const firstPage = source.slice(0, source.indexOf("(Lectura del partido)"));
    expect(firstPage.match(/\(G\. 1\+\) Tj/g)).toHaveLength(2);
    expect(source).toContain("(GOLES DE 1+ RIVAL)");
    expect(source).toContain("(1 de 2)");
    expect(source).toContain("(50%)");
    expect(source.indexOf("(GOLES DE 1+ RIVAL)")).toBeLessThan(
      source.indexOf("(Nuestros lanzamientos)"),
    );
  });
  it("integra métricas nuevas solo cuando existen y no añade un segundo portero vacío", async () => {
    const sheet = testSheet();
    sheet.keeper = 1;
    sheet.keeperStints = [{ period: 1, cap: 1, afterEventId: null }];
    sheet.events = sheet.events
      .filter((e) => !["save", "penalty_save", "keeper_out"].includes(e.kind) || e.cap === 1)
      .map((e) => ({ ...e, keeper: e.keeper === 13 ? 1 : e.keeper }));
    const plain = await createActaPdf(testRecord(sheet)).text();
    expect(plain).not.toContain("Sin segundo portero registrado");
    expect(plain).not.toContain("G. contra");
    expect(plain).not.toContain("T. blq.");
    expect(plain).not.toContain("(Bloqueo)");
    expect(plain).not.toContain("Bloqueos defensivos");
    sheet.events.push(
      ...(["goal_counter", "shot_deflected", "defensive_block"] as const).map((kind, i) => ({
        id: `feedback-${i}`,
        kind,
        side: "us" as const,
        cap: 4,
        period: 1,
        keeper: null,
        deleted: false,
      })),
    );
    const source = await createActaPdf(testRecord(sheet)).text();
    const detailed = [...source.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1]).join(" ");
    expect(detailed).toContain("G. contra");
    expect(detailed).not.toContain("de contra)");
    expect(detailed).not.toContain("T. blq.");
    expect(detailed).toContain("BLOQUEADOS");
    expect(source).toContain("(Bloqueo)");
    expect(source).toContain("(Penalti)");
    expect(source).not.toContain("Blq. def.");
    expect(source).not.toContain("Pen. com.");
    expect(detailed).toContain("Bloqueos defensivos");
    const rosterColumns = [
      "Goles",
      "G. 1+",
      "G. contra",
      "G. pen.",
      "Tiros",
      "Asist.",
      "Bloqueo",
      "Exp.",
      "Penalti",
    ];
    const positions = rosterColumns.map((label) => detailed.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
    const contribution = detailed.slice(
      detailed.indexOf("Aportaci"),
      detailed.indexOf("Nuestra porter"),
    );
    expect(contribution).not.toContain("T. blq.");
    expect(contribution).not.toContain("G. contra");
    expect(contribution).not.toContain("Bloqueo");
    expect(detailed).not.toContain("Goles de contra:");
    expect(detailed).not.toContain("Tiros bloqueados:");
  });
  it.each(["benjamin", "alevin", "infantil"] as const)(
    "omite el apéndice de participación en %s y conserva cuartos y penaltis",
    async (category) => {
      const sheet = testSheet();
      sheet.version = 4;
      sheet.category = category;
      sheet.participation = {
        rulesVersion: 1,
        enabled: true,
        opponentConfirmed: true,
        fixedKeepers: { us: null, them: null },
        lineups: [
          {
            period: 1,
            side: "us",
            keeper: sheet.players[0].id,
            field: [sheet.players[1].id],
            incident: "Faltan jugadores",
          },
          {
            period: 1,
            side: "them",
            keeper: String(sheet.opponentCaps[0]),
            field: sheet.opponentCaps.slice(1).map(String),
            incident: "Faltan jugadores",
          },
        ],
        changes: [],
      };
      const pdfFile = createActaPdf(testRecord(sheet));
      const text = Buffer.from(await pdfFile.arrayBuffer()).toString("latin1");
      const withoutParticipation = Buffer.from(
        await createActaPdf(testRecord({ ...sheet, participation: undefined })).arrayBuffer(),
      ).toString("latin1");
      expect(text.match(/\/MediaBox/g)?.length).toBe(
        withoutParticipation.match(/\/MediaBox/g)?.length,
      );
      expect(text).not.toContain("Participaci");
      expect(text).not.toContain("Cuartos 1");
      expect(text).toContain("El partido, cuarto a cuarto");
      const withShootout = Buffer.from(
        await createActaPdf(
          testRecord({
            ...sheet,
            shootout: {
              firstSide: "us",
              shots: [{ id: "shot-1", side: "us", cap: 4, keeper: null, outcome: "goal" }],
            },
          }),
        ).arrayBuffer(),
      ).toString("latin1");
      expect(withShootout).toContain("TANDA DE PENALTIS");
      expect(withShootout).not.toContain("Participaci");
    },
  );
  it("continúa la tanda en la tabla de los cuartos y muestra el total sin el texto antiguo", async () => {
    const base = testSheet();
    const regular = createActaPdf(testRecord(base));
    const withShootout = createActaPdf(
      testRecord({
        ...base,
        shootout: {
          firstSide: "us",
          shots: [
            { id: "s1", side: "us", cap: 4, keeper: null, outcome: "goal" },
            { id: "s2", side: "them", cap: 5, keeper: 1, outcome: "save" },
          ],
        },
      }),
    );
    const original = Buffer.from(await regular.arrayBuffer()).toString("latin1");
    const updated = Buffer.from(await withShootout.arrayBuffer()).toString("latin1");
    expect(updated.match(/\/MediaBox/g)?.length).toBe(original.match(/\/MediaBox/g)?.length);
    expect(updated).toContain("TANDA DE PENALTIS");
    expect(updated).not.toContain("con penaltis");
    expect(updated).toContain("En la tanda: 1 - 0");
    expect(updated).toContain("Parado");
    expect(updated).not.toContain("Portero: 1");
  });
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

  it("abrevia Expulsiones a Exp. en la tabla rival cuando hay columna de tarjetas", async () => {
    const sheet = testSheet();
    sheet.events.push({
      id: "ev-card",
      side: "them",
      cap: 9,
      kind: "red",
      period: 2,
      keeper: null,
      deleted: false,
    });
    const record = testRecord(sheet);
    const pdfFile = createActaPdf(record);
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfString = Buffer.from(arrayBuffer).toString("latin1");
    expect(pdfString).toContain("Tarjetas");
    expect(pdfString).toContain("Exp.");
  });

  it("organiza goleadores rivales en dos tablas por fila cuando hay múltiples goleadores", async () => {
    const sheet = testSheet();
    const rivalScorerCaps = [2, 5, 3, 4, 6, 9, 12];
    rivalScorerCaps.forEach((cap, i) => {
      sheet.events.push({
        id: `ev-goal-them-${i}`,
        side: "them",
        cap,
        kind: "goal",
        period: 1 + (i % 4),
        keeper: 1,
        deleted: false,
      });
    });
    const record = testRecord(sheet);
    const pdfFile = createActaPdf(record);
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfString = Buffer.from(arrayBuffer).toString("latin1");
    const matches = [...pdfString.matchAll(/Goleadores rivales/g)];
    expect(matches.length).toBe(1);
  });
});

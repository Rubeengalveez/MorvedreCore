import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { createActaPdf } = require("../lib/domain/acta-pdf.ts");
const names = [
  "Marc Ferrer Vidal",
  "Pau Bravo Jiménez",
  "Eneko Jiménez Prieto",
  "Sofía Vargas Rojas",
  "Leo Gil Ruiz",
  "Arnau Solà Díaz",
  "Oliver Torres Domínguez",
  "Saúl Rojas Vázquez",
  "Jan Vallès García",
  "Liam Gallego Serrano",
  "Izan Ruiz Méndez",
  "Asier Rojas Prieto",
  "Adrián Martínez Pérez",
  "Víctor Navarro García",
];
const players = names.map((name, i) => ({ id: `p${i}`, cap: i + 1, name }));
const events = [];
let n = 0;
const add = (period, side, cap, kind, extra = {}) => {
  const e = {
    id: `e${++n}`,
    period,
    side,
    cap,
    kind,
    keeper: side === "them" && kind.startsWith("goal") ? (period <= 2 ? 1 : 13) : null,
    deleted: false,
    ...extra,
  };
  events.push(e);
  return e;
};
for (let period = 1; period <= 4; period++) {
  const keeper = period <= 2 ? 1 : 13;
  for (let i = 0; i < 3; i++) {
    const g = add(period, "us", 2 + ((period + i) % 10), i === 0 ? "goal_extra" : "goal");
    if (i < 2) add(period, "us", 2 + ((period + i + 2) % 10), "assist", { related_event_id: g.id });
    if (i < 2 || period === 3) add(period, "them", 3 + i, "goal");
    add(period, "us", keeper, "save", { keeper });
  }
  add(period, "them", period === 4 ? 5 : 4, "exclusion");
  add(period, "us", period === 4 ? 5 : 6, "exclusion");
  for (const kind of ["shot_out", "shot_saved", "shot_blocked", "shot_corner"])
    add(period, "us", period + 2, kind);
  add(period, "us", keeper, "keeper_out", { keeper });
  if (period === 2) {
    add(period, "them", 7, "penalty");
    add(period, "us", 2, "goal_penalty");
  }
  if (period === 3) {
    add(period, "them", 8, "penalty");
    add(period, "us", 3, "penalty_missed", { missOutcome: "out" });
    add(period, "us", 1, "penalty");
    add(period, "us", keeper, "penalty_save", { keeper });
  }
  if (period === 4) {
    add(period, "them", null, "coach_yellow");
    add(period, "us", null, "timeout");
  }
}
const sheet = {
  version: 2,
  players,
  opponentCaps: players.map((p) => p.cap),
  periods: 4,
  period: 4,
  phase: "finished",
  keeper: 13,
  events,
  baseline: [],
  baselineThem: 0,
};
sheet.keeperStints = [1, 2, 3, 4].map((period) => ({
  period,
  cap: period <= 2 ? 1 : 13,
  afterEventId: null,
}));
const record = {
  matchId: "preview",
  owner: "preview",
  viewer: "preview",
  canEdit: true,
  opponent: "CW Castellón",
  team: "Juvenil",
  date: "2026-09-14T18:00:00Z",
  competition: "league",
  venue: "Piscina Municipal Puerto de Sagunto",
  homeAway: "home",
  revision: 12,
  mutation: "preview",
  device: "preview",
  sheet,
  dirty: false,
};
if (process.argv.includes("--shootout")) {
  add(4, "us", 2, "goal");
  for (let i = 0; i < 5; i++) add(4, "them", 2 + i, "goal");
  const ours = ["out", "goal", "goal", "goal", "save", "goal", "post", "goal", "out", "save"];
  const theirs = ["goal", "goal", "save", "goal", "out", "goal", "post", "goal", "save", "goal"];
  sheet.shootout = {
    firstSide: "us",
    shots: ours.flatMap((outcome, i) => [
      { id: `shootout-us-${i}`, side: "us", cap: 2 + i % 5, keeper: null, outcome },
      { id: `shootout-them-${i}`, side: "them", cap: 2 + i % 5, keeper: 13, outcome: theirs[i] },
    ]),
  };
}
const outputPath = process.argv.includes("--shootout")
  ? "output/pdf/acta-tanda-penaltis.pdf"
  : "output/pdf/acta-redisenada.pdf";
mkdirSync("output/pdf", { recursive: true });
writeFileSync(
  outputPath,
  Buffer.from(await createActaPdf(record).arrayBuffer()),
);
mkdirSync("tmp/pdfs", { recursive: true });
writeFileSync("tmp/pdfs/record.json", JSON.stringify(record));
console.log(outputPath);

if (process.argv.includes("--stress")) {
  const allScorers = {
    ...record,
    sheet: {
      ...sheet,
      events: [
        ...events,
        ...players.map((p) => ({
          id: `scorer-${p.cap}`,
          period: 4,
          side: "them",
          cap: p.cap,
          kind: "goal",
          keeper: 13,
          deleted: false,
        })),
      ],
    },
  };
  writeFileSync(
    "tmp/pdfs/all-scorers.pdf",
    Buffer.from(await createActaPdf(allScorers).arrayBuffer()),
  );
  const longPlayers = Array.from({ length: 30 }, (_, i) => ({
    id: `s${i}`,
    cap: i + 1,
    name: `${names[i % names.length]} de los Santos Fernández García del Río`,
  }));
  const stress = {
    ...record,
    opponent: "Club Waterpolo Deportivo de la Comunidad Valenciana Equipo Absoluto",
    team: "Equipo de categoría juvenil de Morvedre",
    sheet: {
      ...sheet,
      players: longPlayers,
      opponentCaps: longPlayers.map((p) => p.cap),
      periods: 8,
      period: 8,
      baseline: [{ cap: 2, goals: 3, exclusions: 1 }],
      baselineThem: 2,
      events: [
        ...events,
        ...events.map((e) => ({
          ...e,
          id: `copy${e.id}`,
          period: e.period + 4,
          related_event_id: e.related_event_id ? `copy${e.related_event_id}` : undefined,
        })),
      ],
    },
  };
  writeFileSync("tmp/pdfs/stress.pdf", Buffer.from(await createActaPdf(stress).arrayBuffer()));
  const empty = {
    ...record,
    sheet: { ...sheet, events: [], keeperStints: [], phase: "ready", period: 1 },
  };
  writeFileSync("tmp/pdfs/empty.pdf", Buffer.from(await createActaPdf(empty).arrayBuffer()));
  console.log("Variantes: 30 jugadores, 8 partes, nombres largos, datos previos y acta vacía.");
}

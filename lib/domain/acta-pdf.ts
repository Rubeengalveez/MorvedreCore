import { jsPDF } from "jspdf";
import {
  activeEvents,
  describeEvent,
  isGoal,
  percentage,
  playerTotals,
  score,
  timeoutCount,
  type LiveRecord,
} from "./live-match";

const NAVY: [number, number, number] = [6, 32, 72];
const BLUE: [number, number, number] = [22, 87, 168];
const PALE: [number, number, number] = [226, 239, 244];
const LINE: [number, number, number] = [190, 204, 218];

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function percentLabel(value: number | null) {
  return value === null ? "Sin datos" : `${Math.round(value)}%`;
}

function filePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 38);
}

function competitionLabel(value?: string) {
  return (
    {
      league: "Liga",
      cup: "Copa",
      tournament: "Torneo",
      friendly: "Amistoso",
    }[value ?? ""] ?? value
  );
}

export function createActaPdf(record: LiveRecord) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const sheet = record.sheet;
  const events = activeEvents(sheet);
  const ownPlayers = [...sheet.players].sort((a, b) => a.cap - b.cap);
  const ownTotals = ownPlayers.map((player) => playerTotals(sheet, "us", player.cap));
  const rivalTotals = sheet.opponentCaps.map((cap) => playerTotals(sheet, "them", cap));
  const total = (key: keyof (typeof ownTotals)[number]) =>
    ownTotals.reduce(
      (sum, player) => sum + (typeof player[key] === "number" ? Number(player[key]) : 0),
      0,
    );
  const rivalTotal = (key: keyof (typeof rivalTotals)[number]) =>
    rivalTotals.reduce(
      (sum, player) => sum + (typeof player[key] === "number" ? Number(player[key]) : 0),
      0,
    );
  const hasBaseline =
    sheet.baselineThem > 0 || sheet.baseline.some((entry) => entry.goals || entry.exclusions);

  function pageHeader(title: string, subtitle: string) {
    const width = doc.internal.pageSize.getWidth();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, width, 29, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MORVEDRE CORE", 14, 12);
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), 14, 20);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle.length > 72 ? `${subtitle.slice(0, 69)}...` : subtitle, width - 14, 12, {
      align: "right",
    });
    const context = [
      dateLabel(record.date),
      record.venue,
      competitionLabel(record.competition),
      record.homeAway === "home" ? "Local" : record.homeAway === "away" ? "Visitante" : null,
    ]
      .filter(Boolean)
      .join(" | ");
    doc.text(context.length > 92 ? `${context.slice(0, 89)}...` : context, width - 14, 20, {
      align: "right",
    });
    doc.setTextColor(...NAVY);
  }

  function heading(text: string, x: number, y: number, width: number) {
    doc.setFillColor(...PALE);
    doc.roundedRect(x, y, width, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(text, x + 3, y + 5.4);
  }

  function tableRow(
    values: string[],
    columns: Array<{ x: number; width: number; align?: "left" | "center" | "right" }>,
    y: number,
    height: number,
    fill?: [number, number, number],
    bold = false,
  ) {
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(columns[0].x, y, columns.reduce((sum, column) => sum + column.width, 0), height, "F");
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    values.forEach((value, index) => {
      const column = columns[index];
      if (!column) return;
      doc.rect(column.x, y, column.width, height);
      const align = column.align ?? "center";
      const padding = 1.5;
      const textX =
        align === "left"
          ? column.x + padding
          : align === "right"
            ? column.x + column.width - padding
            : column.x + column.width / 2;
      const fitted = String(value).length > 25 ? `${String(value).slice(0, 23)}...` : String(value);
      doc.text(fitted, textX, y + height / 2 + 1.2, { align });
    });
  }

  pageHeader(
    `${sheet.phase === "finished" ? "Acta de partido" : "Acta provisional"} · revisión ${record.revision}`,
    `${record.team} contra ${record.opponent}`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${record.team} - resumen por jugador`, 14, 39);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("G = goles | G.N = normal | G+ = superioridad | G.P = penalti | Fall = tiros fallados", 283, 39, {
    align: "right",
  });

  const widths = [13, 48, 12, 12, 12, 12, 14, 14, 12, 13, 13, 14, 14, 13, 14, 13];
  let columnX = 14;
  const columns = widths.map((width, index) => {
    const column = { x: columnX, width, align: index === 1 ? ("left" as const) : ("center" as const) };
    columnX += width;
    return column;
  });
  const labels = ["Gorro", "Jugador", "G", "G.N", "G+", "G.P", "Tiros", "Fall", "Ast", "Exp", "Pen", "Fuera", "Bloq", "Córner", "Amar", "Roja"];
  doc.setTextColor(255, 255, 255);
  tableRow(labels, columns, 43, 8, NAVY, true);
  doc.setTextColor(...NAVY);

  let y = 51;
  for (let index = 0; index < 14; index += 1) {
    const player = ownPlayers[index];
    if (!player) {
      tableRow(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], columns, y, 6.8, index % 2 ? [248, 250, 252] : undefined);
      y += 6.8;
      continue;
    }
    const totals = playerTotals(sheet, "us", player.cap);
    tableRow(
      [
        String(player.cap),
        player.name,
        String(totals.goals),
        String(totals.goalsNormal),
        String(totals.goalsExtra),
        String(totals.goalsPenalty),
        String(totals.shots),
        String(totals.missedShots),
        String(totals.assists),
        String(totals.exclusions),
        String(totals.penaltiesCommitted),
        String(totals.shotsOut),
        String(totals.shotsBlocked),
        String(totals.shotsCorner),
        totals.yellow ? "Sí" : "-",
        totals.red ? "Sí" : "-",
      ],
      columns,
      y,
      6.8,
      totals.red || totals.exclusions >= 3
        ? [255, 226, 224]
        : totals.exclusions === 2
          ? [255, 237, 213]
          : totals.exclusions === 1
            ? [255, 249, 219]
            : index % 2
              ? [248, 250, 252]
              : undefined,
    );
    y += 6.8;
  }

  tableRow(
    [
      "",
      ownPlayers.length > 14 ? "TOTAL ACTA" : "TOTALES",
      String(total("goals")),
      String(total("goalsNormal")),
      String(total("goalsExtra")),
      String(total("goalsPenalty")),
      String(total("shots")),
      String(total("missedShots")),
      String(total("assists")),
      String(total("exclusions")),
      String(total("penaltiesCommitted")),
      String(total("shotsOut")),
      String(total("shotsBlocked")),
      String(total("shotsCorner")),
      String(ownTotals.filter((entry) => entry.yellow).length),
      String(ownTotals.filter((entry) => entry.red).length),
    ],
    columns,
    y,
    7,
    PALE,
    true,
  );

  const lowerY = 158;
  heading("Parciales", 14, lowerY, 78);
  const partialY = lowerY + 11;
  const playedThrough =
    sheet.phase === "ready" ? 0 : sheet.phase === "finished" ? sheet.periods : sheet.period;
  doc.setFontSize(8.5);
  for (let period = 1; period <= sheet.periods; period += 1) {
    const column = (period - 1) % 2;
    const row = Math.floor((period - 1) / 2);
    const x = 14 + column * 39;
    const py = partialY + row * 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Cuarto ${period}`, x, py);
    doc.setFont("helvetica", "bold");
    doc.text(
      period <= playedThrough
        ? `${score(sheet, "us", period)} - ${score(sheet, "them", period)}`
        : "—",
      x + 34,
      py,
      { align: "right" },
    );
  }

  heading("Porteros de Morvedre", 99, lowerY, 101);
  let keeperY = lowerY + 11;
  const keepers = sheet.players.filter(
    (player) =>
      player.cap === 1 ||
      player.cap === 13 ||
      events.some(
        (event) =>
          event.keeper === player.cap ||
          (event.cap === player.cap && (event.kind === "save" || event.kind === "penalty_save")),
      ),
  );
  doc.setFontSize(8.5);
  for (const player of keepers.slice(0, 3)) {
    const totals = playerTotals(sheet, "us", player.cap);
    doc.setFont("helvetica", "bold");
    doc.text(`#${player.cap} ${player.name}`, 102, keeperY);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${totals.saves} paradas (${totals.penaltySaves} pen.) | ${totals.conceded} encajados | ${percentLabel(percentage(totals.saves, totals.received))}`,
      198,
      keeperY,
      { align: "right" },
    );
    keeperY += 7;
  }

  doc.setFillColor(...NAVY);
  doc.roundedRect(207, lowerY, 76, 35, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(sheet.phase === "finished" ? "RESULTADO FINAL" : "RESULTADO PROVISIONAL", 245, lowerY + 8, { align: "center" });
  doc.setFontSize(24);
  doc.text(`${score(sheet, "us")} - ${score(sheet, "them")}`, 245, lowerY + 23, { align: "center" });
  doc.setFontSize(8);
  doc.text(`${timeoutCount(sheet, "us")} tiempos Morvedre | ${timeoutCount(sheet, "them")} rival`, 245, lowerY + 31, { align: "center" });
  doc.setTextColor(...NAVY);

  if (hasBaseline) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.text("Hay totales anteriores al acta en directo sin cuarto ni tipo de jugada.", 14, 198);
  }
  if (record.dirty) {
    doc.setTextColor(143, 83, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Incluye cambios guardados en este móvil pendientes de sincronizar.", 283, 198, { align: "right" });
    doc.setTextColor(...NAVY);
  }

  if (ownPlayers.length > 14) {
    doc.addPage("a4", "portrait");
    pageHeader("Continuación de jugadores", `${record.team} contra ${record.opponent}`);
    heading("Jugadores de acta histórica", 14, 38, 182);
    doc.setFontSize(9);
    ownPlayers.slice(14).forEach((player, index) => {
      const totals = playerTotals(sheet, "us", player.cap);
      const rowY = 52 + index * 12;
      doc.setFont("helvetica", "bold");
      doc.text(`#${player.cap} ${player.name}`, 17, rowY);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${totals.goals} goles · ${totals.shots} tiros · ${totals.assists} asistencias · ${totals.exclusions}/3 expulsiones`,
        17,
        rowY + 5,
      );
    });
  }

  doc.addPage("a4", "portrait");
  pageHeader("Análisis del partido", `${record.team} contra ${record.opponent}`);

  const goals = score(sheet, "us");
  const detailedGoals = events.filter((event) => event.side === "us" && isGoal(event.kind)).length;
  const detailedShots = events.filter(
    (event) =>
      event.side === "us" &&
      (isGoal(event.kind) ||
        ["shot_out", "shot_saved", "shot_blocked", "shot_corner", "penalty_missed"].includes(
          event.kind,
        )),
  ).length;
  const keeperSaves = total("saves");
  const keeperReceived = total("received");
  const rivalSanctions = rivalTotal("exclusions");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Cómo ha sido el partido", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Porcentajes calculados solo con las jugadas registradas en el acta.", 14, 49);

  const metrics = [
    [
      hasBaseline ? "Acierto en jugadas detalladas" : "Acierto de tiro",
      percentLabel(percentage(detailedGoals, detailedShots)),
      `${detailedGoals} goles de ${detailedShots} tiros con detalle`,
    ],
    ["Peso del +1 en goles detallados", percentLabel(percentage(total("goalsExtra"), detailedGoals)), `${total("goalsExtra")} de ${detailedGoals} goles tipificados`],
    ["Paradas", percentLabel(percentage(keeperSaves, keeperReceived)), `${keeperSaves} paradas de ${keeperReceived} tiros recibidos`],
    ["Tiros fuera / palo", percentLabel(percentage(total("shotsOut"), detailedShots)), `${total("shotsOut")} de ${detailedShots} tiros con detalle`],
  ];
  metrics.forEach(([label, value, detail], index) => {
    const x = 14 + (index % 2) * 91;
    const my = 58 + Math.floor(index / 2) * 31;
    doc.setFillColor(index % 2 ? 242 : 235, 246, 250);
    doc.roundedRect(x, my, 84, 25, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, x + 4, my + 7);
    doc.setFontSize(16);
    doc.text(value, x + 80, my + 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(detail, x + 4, my + 20);
  });

  heading("Tiros registrados", 14, 125, 84);
  const shotBars = [
    ["Goles detallados", detailedGoals],
    ["Fuera / palo", total("shotsOut")],
    ["Bloqueados", total("shotsBlocked")],
    ["A córner", total("shotsCorner")],
    ["Penaltis fallados", total("penaltiesMissed")],
  ] as const;
  const maxShot = Math.max(1, ...shotBars.map(([, value]) => value));
  shotBars.forEach(([label, value], index) => {
    const by = 140 + index * 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(label, 14, by);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(48, by - 4, 42, 5, 1, 1, "F");
    doc.setFillColor(...BLUE);
    if (value > 0) doc.roundedRect(48, by - 4, (42 * value) / maxShot, 5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.text(String(value), 95, by, { align: "right" });
  });

  heading("Comparativa", 105, 125, 91);
  const comparisons = [
    ["Goles", goals, score(sheet, "them")],
    ["Expulsiones + penaltis", total("exclusions"), rivalSanctions],
    ["Tiempos muertos", timeoutCount(sheet, "us"), timeoutCount(sheet, "them")],
  ] as const;
  doc.setFontSize(8.5);
  comparisons.forEach(([label, us, them], index) => {
    const cy = 141 + index * 15;
    doc.setFont("helvetica", "bold");
    doc.text(label, 105, cy);
    doc.setFontSize(13);
    doc.text(String(us), 166, cy, { align: "right" });
    doc.setFontSize(8);
    doc.text("Morvedre", 168, cy, { align: "left" });
    doc.setFontSize(13);
    doc.text(String(them), 190, cy, { align: "right" });
    doc.setFontSize(8);
    doc.text("Rival", 192, cy, { align: "left" });
    doc.setFontSize(8.5);
  });

  heading("Evolución al cierre de cada cuarto", 14, 185, 84);
  const evolution = Array.from({ length: playedThrough }, (_, index) => {
    const period = index + 1;
    return {
      period,
      us:
        sheet.baseline.reduce((sum, entry) => sum + entry.goals, 0) +
        events.filter(
          (event) => event.period <= period && event.side === "us" && isGoal(event.kind),
        ).length,
      them:
        sheet.baselineThem +
        events.filter(
          (event) => event.period <= period && event.side === "them" && isGoal(event.kind),
        ).length,
    };
  });
  if (evolution.length) {
    const maxEvolution = Math.max(1, ...evolution.flatMap((entry) => [entry.us, entry.them]));
    const point = (index: number, value: number) => ({
      x: evolution.length === 1 ? 56 : 18 + (76 * index) / (evolution.length - 1),
      y: 213 - (14 * value) / maxEvolution,
    });
    for (const [color, key] of [
      [BLUE, "us"],
      [[244, 107, 53] as [number, number, number], "them"],
    ] as const) {
      doc.setDrawColor(...color);
      doc.setFillColor(...color);
      evolution.forEach((entry, index) => {
        const current = point(index, entry[key]);
        if (index > 0) {
          const previous = point(index - 1, evolution[index - 1][key]);
          doc.line(previous.x, previous.y, current.x, current.y);
        }
        doc.circle(current.x, current.y, 1.2, "F");
      });
    }
    doc.setTextColor(...NAVY);
    doc.setFontSize(7);
    evolution.forEach((entry, index) => {
      const x = point(index, 0).x;
      doc.text(`C${entry.period}`, x, 218, { align: "center" });
    });
    doc.setFont("helvetica", "bold");
    doc.text("Morvedre", 18, 196);
    doc.setTextColor(180, 73, 30);
    doc.text("Rival", 45, 196);
    doc.setTextColor(...NAVY);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Todavía no hay cuartos jugados.", 17, 201);
  }

  heading("Goles y sanciones del rival", 105, 185, 91);
  const rivalRows = sheet.opponentCaps
    .map((cap) => ({ cap, totals: playerTotals(sheet, "them", cap) }))
    .filter(({ totals }) => totals.goals || totals.exclusions || totals.red || totals.yellow);
  doc.setFontSize(8.5);
  if (rivalRows.length === 0) {
    doc.text("No hay goles ni sanciones rivales registrados.", 108, 199);
  } else {
    rivalRows.slice(0, 10).forEach(({ cap, totals }, index) => {
      const ry = 199 + index * 8;
      const rx = 108;
      doc.setFont("helvetica", "bold");
      doc.text(`#${cap}`, rx, ry);
      doc.setFont("helvetica", "normal");
      doc.text(`${totals.goals} goles | ${totals.exclusions}/3 exp.${totals.red ? " | roja" : ""}`, rx + 10, ry);
    });
  }

  for (let offset = 10; offset < rivalRows.length; offset += 20) {
    doc.addPage("a4", "portrait");
    pageHeader("Detalle del rival", `${record.team} contra ${record.opponent}`);
    heading("Goles y sanciones del rival · continuación", 14, 38, 182);
    rivalRows.slice(offset, offset + 20).forEach(({ cap, totals }, index) => {
      const rowY = 53 + index * 11;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`#${cap}`, 17, rowY);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${totals.goals} goles · ${totals.exclusions}/3 expulsiones · ${totals.penaltiesCommitted} penaltis${totals.yellow ? " · amarilla" : ""}${totals.red ? " · roja" : ""}`,
        31,
        rowY,
      );
    });
  }

  doc.addPage("a4", "portrait");
  pageHeader("Desarrollo del partido por cuartos", "Secuencia de anotación, sin tiempo exacto");
  let timelineY = 40;
  for (let period = 1; period <= sheet.periods; period += 1) {
    const periodEvents = events.filter((event) => event.period === period);
    const periodEntries = periodEvents.filter(
      (event) =>
        !(
          event.related_event_id &&
          (event.kind === "assist" || event.origin === "penalty_flow")
        ),
    );
    const required = 16 + Math.max(1, periodEntries.length) * 7;
    if (timelineY + required > 288) {
      doc.addPage("a4", "portrait");
      pageHeader("Desarrollo del partido por cuartos", "Continuación, sin tiempo exacto");
      timelineY = 40;
    }
    const accumulatedUs =
      sheet.baseline.reduce((sum, entry) => sum + entry.goals, 0) +
      events.filter(
        (event) => event.period <= period && event.side === "us" && isGoal(event.kind),
      ).length;
    const accumulatedThem =
      sheet.baselineThem +
      events.filter(
        (event) => event.period <= period && event.side === "them" && isGoal(event.kind),
      ).length;
    heading(
      `Cuarto ${period} | Parcial ${score(sheet, "us", period)} - ${score(sheet, "them", period)} | Acumulado ${accumulatedUs} - ${accumulatedThem}`,
      14,
      timelineY,
      182,
    );
    timelineY += 12;
    if (periodEvents.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("Sin jugadas registradas.", 18, timelineY);
      timelineY += 9;
      continue;
    }
    for (const [index, event] of periodEntries.entries()) {
      const markerColor: [number, number, number] = isGoal(event.kind)
        ? [18, 120, 80]
        : event.kind === "red" || event.kind === "coach_red"
          ? [166, 45, 38]
          : BLUE;
      const eventIndex = periodEvents.findIndex((candidate) => candidate.id === event.id);
      const assistance =
        isGoal(event.kind) && event.side === "us"
          ? periodEvents.find(
              (candidate) =>
                candidate.kind === "assist" && candidate.related_event_id === event.id,
            )
          : undefined;
      const penaltyResult =
        event.kind === "penalty" && event.side === "them"
          ? periodEvents.find(
              (candidate) =>
                candidate.origin === "penalty_flow" && candidate.related_event_id === event.id,
            )
          : undefined;
      const markerUs =
        sheet.baseline.reduce((sum, entry) => sum + entry.goals, 0) +
        periodEvents
          .slice(0, eventIndex + 1)
          .filter((candidate) => candidate.side === "us" && isGoal(candidate.kind)).length +
        events.filter(
          (candidate) =>
            candidate.period < period && candidate.side === "us" && isGoal(candidate.kind),
        ).length;
      const markerThem =
        sheet.baselineThem +
        periodEvents
          .slice(0, eventIndex + 1)
          .filter((candidate) => candidate.side === "them" && isGoal(candidate.kind)).length +
        events.filter(
          (candidate) =>
            candidate.period < period && candidate.side === "them" && isGoal(candidate.kind),
        ).length;
      const linkedText = assistance
        ? ` | Asistencia #${assistance.cap}`
        : penaltyResult
          ? ` -> ${describeEvent(penaltyResult, sheet).replaceAll("·", "-")}`
          : "";
      const scoreText = isGoal(event.kind) ? ` | Marcador ${markerUs}-${markerThem}` : "";
      const description = `${describeEvent(event, sheet).replaceAll("·", "-")}${linkedText}${scoreText}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(description, 158) as string[];
      if (timelineY + Math.max(7, lines.length * 5) > 286) {
        doc.addPage("a4", "portrait");
        pageHeader("Desarrollo del partido por cuartos", "Continuación, sin tiempo exacto");
        timelineY = 40;
        heading(`Cuarto ${period} · continuación`, 14, timelineY, 182);
        timelineY += 12;
      }
      doc.setFillColor(...markerColor);
      doc.circle(19, timelineY - 1.3, 1.6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(index + 1), 25, timelineY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(lines, 34, timelineY);
      timelineY += Math.max(7, lines.length * 5);
    }
    timelineY += 4;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...LINE);
    doc.line(14, height - 8, width - 14, height - 8);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Morvedre Core | ${record.team} contra ${record.opponent}`, 14, height - 4);
    doc.text(`Página ${page} de ${pageCount}`, width - 14, height - 4, { align: "right" });
  }

  return new File(
    [doc.output("arraybuffer")],
    `acta-${record.date.slice(0, 10)}-${filePart(record.team)}-${filePart(record.opponent)}.pdf`,
    { type: "application/pdf" },
  );
}

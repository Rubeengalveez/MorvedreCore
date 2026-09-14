import { jsPDF } from "jspdf";
import { actaAnalysis } from "./acta-analysis";
import { isGoal, playerTotals, type LiveRecord, type ActionKind } from "./live-match";

type Color = [number, number, number];
const NAVY: Color = [10, 46, 92];
const BLUE: Color = [29, 91, 151];
const ORANGE: Color = [181, 86, 39];
const GRAY: Color = [55, 72, 92];
const PALE: Color = [241, 245, 248];
const LINE: Color = [177, 193, 207];
const WHITE: Color = [255, 255, 255];
const pct = (value: number | null) => (value === null ? "Sin datos" : `${Math.round(value)}%`);
const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 38);

export function createActaPdf(record: LiveRecord): File {
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const sheet = record.sheet;
  const a = actaAnalysis(sheet);
  const team = `Morvedre · ${record.team}`;
  const date = new Date(record.date).toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const competition =
    (
      { league: "Liga", cup: "Copa", tournament: "Torneo", friendly: "Amistoso" } as Record<
        string,
        string
      >
    )[record.competition ?? ""] ??
    record.competition ??
    "";
  const role =
    record.homeAway === "home" ? "Local" : record.homeAway === "away" ? "Visitante" : "Neutral";
  const status =
    sheet.phase === "finished"
      ? "Finalizado"
      : sheet.phase === "ready"
        ? "Sin empezar"
        : "Provisional";
  const bottom = () => doc.internal.pageSize.getHeight() - 17;
  function text(
    value: string,
    x: number,
    y: number,
    size = 9,
    bold = false,
    color: Color = NAVY,
    align: "left" | "center" | "right" = "left",
  ) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  }
  function wrap(value: string, x: number, y: number, width: number, size = 8, color: Color = GRAY) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(value, width) as string[];
    lines.forEach((line, i) => text(line, x, y + i * size * 0.42, size, false, color));
    return lines.length * size * 0.42;
  }
  function line(x: number, y: number, width: number) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(x, y, x + width, y);
  }
  function fill(x: number, y: number, w: number, h: number, color = PALE) {
    doc.setFillColor(...color);
    doc.rect(x, y, w, h, "F");
  }
  function header(title: string) {
    const w = doc.internal.pageSize.getWidth();
    fill(0, 0, w, 2, NAVY);
    text(title, 14, 19, 21, true);
    text("MORVEDRE", w - 14, 18, 9, true, BLUE, "right");
    return 31;
  }
  function newPage(title: string, orientation: "portrait" | "landscape" = "portrait") {
    doc.addPage("a4", orientation);
    return header(title);
  }
  function tableRow(
    values: string[],
    widths: number[],
    x: number,
    y: number,
    options: {
      header?: boolean;
      total?: boolean;
      striped?: boolean;
      height?: number;
      size?: number;
      left?: number[];
      cap?: boolean;
      accent?: Color;
      emphasis?: number[];
      highlight?: number[];
      quiet?: boolean;
      singleLine?: number[];
    } = {},
  ) {
    const size = options.size ?? 8;
    doc.setFont("helvetica", options.header || options.total ? "bold" : "normal");
    doc.setFontSize(size);
    const cellSizes = values.map((v, i) =>
      options.header && (!v.includes(" ") || options.singleLine?.includes(i))
        ? Math.min(size, (size * (widths[i] - 3)) / Math.max(1, doc.getTextWidth(v)))
        : size,
    );
    const lines = values.map((v, i) => {
      doc.setFontSize(cellSizes[i]);
      const rows = doc.splitTextToSize(
        options.quiet && v === "0" ? "-" : v,
        widths[i] - 3,
      ) as string[];
      doc.setFontSize(size);
      return rows;
    });
    const h = Math.max(options.height ?? 6, ...lines.map((v) => v.length * size * 0.39 + 3));
    fill(
      x,
      y,
      widths.reduce((s, w) => s + w, 0),
      h,
      options.header ? NAVY : options.total || options.striped ? PALE : WHITE,
    );
    let cx = x;
    lines.forEach((rows, i) => {
      const left = options.left?.includes(i);
      const empty = options.quiet && (values[i] === "0" || values[i] === "-");
      const numeric = options.quiet && i > 0 && !left && !empty && /^\d/.test(values[i]);
      if (empty && !options.header)
        fill(cx, y, widths[i], h, options.striped ? [237, 243, 248] : [250, 252, 254]);
      if (numeric && !options.header)
        fill(cx + 0.8, y + 0.6, widths[i] - 1.6, h - 1.2, [226, 237, 247]);
      if (options.highlight?.includes(i) && !options.header)
        fill(cx, y, widths[i], h, [218, 230, 241]);
      if (i === 0 && options.cap && !options.header)
        fill(cx, y, widths[i], h, options.accent ?? NAVY);
      rows.forEach((value, j) =>
        text(
          value,
          left ? cx + 1.5 : cx + widths[i] / 2,
          y + (h - rows.length * size * 0.39) / 2 + size * 0.32 + j * size * 0.39,
          cellSizes[i],
          options.header ||
            options.total ||
            (i === 0 && options.cap) ||
            numeric ||
            options.emphasis?.includes(i),
          options.header || (i === 0 && options.cap)
            ? WHITE
            : empty
              ? [139, 150, 162]
              : (options.accent ?? NAVY),
          left ? "left" : "center",
        ),
      );
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.15);
      doc.rect(cx, y, widths[i], h);
      cx += widths[i];
    });
    return y + h;
  }
  function bar(x: number, y: number, width: number, value: number, max: number, color = BLUE) {
    fill(x, y, width, 3, [174, 191, 207]);
    if (value > 0 && max > 0) fill(x, y, width * Math.min(1, value / max), 3, color);
  }
  const cards = (yellow: boolean, red: boolean) =>
    [yellow ? "Amarilla" : "", red ? "Roja" : ""].filter(Boolean).join(" / ") || "-";

  const finished = sheet.phase === "finished";
  const resultColor: Color = !finished
    ? NAVY
    : a.goalsUs > a.goalsThem
      ? [24, 104, 65]
      : a.goalsUs < a.goalsThem
        ? [165, 40, 49]
        : [160, 114, 12];
  const resultLabel = !finished
    ? status
    : a.goalsUs > a.goalsThem
      ? "VICTORIA"
      : a.goalsUs < a.goalsThem
        ? "DERROTA"
        : "EMPATE";
  fill(0, 0, 297, 4, resultColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const ownName = doc.splitTextToSize(team, 94) as string[];
  const rivalName = doc.splitTextToSize(record.opponent, 94) as string[];
  ownName.forEach((name, i) => text(name, 14, 22 + i * 5.7, 15, true));
  rivalName.forEach((name, i) => text(name, 283, 22 + i * 5.7, 15, true, NAVY, "right"));
  text(`${a.goalsUs} - ${a.goalsThem}`, 148.5, 27, 52, true, NAVY, "center");
  const ownCards = a.players.some((p) => p.totals.yellow || p.totals.red);
  const rivalCards = sheet.opponentCaps.some((cap) => {
    const t = playerTotals(sheet, "them", cap);
    return t.yellow || t.red;
  });
  const penaltyGoalColumn = a.events.some(
    (e) => e.kind === "goal_penalty" || (e.kind === "goal" && e.origin === "penalty_flow"),
  );
  const ownHead = [
    "Gorro",
    "Jugador",
    "Goles",
    "Tiros",
    "Asistencias",
    "Expulsiones",
    "Penaltis",
    "Goles 1+",
    ...(penaltyGoalColumn ? ["Goles de penalti"] : []),
    ...(ownCards ? ["Tarjetas"] : []),
  ];
  const rivalHead = [
    "Gorro",
    "Goles",
    "Expulsiones",
    "Penaltis",
    ...(rivalCards ? ["Tarjetas"] : []),
  ];
  const ownWidths = [
    12,
    49,
    ...Array.from({ length: ownHead.length - 2 }, () => 134 / (ownHead.length - 2)),
  ];
  const rivalWidths = [
    12,
    ...Array.from({ length: rivalHead.length - 1 }, () => 56 / (rivalHead.length - 1)),
  ];
  const rivalX = 215;
  const rivalCaps = [...sheet.opponentCaps].sort((x, y) => x - y);
  const keeperPlayers = a.players.filter((p) => p.keeper);
  let y = Math.max(36, 27 + Math.max(ownName.length, rivalName.length) * 5.7);
  const rosterHeader = () => {
    text("Nuestro equipo", 14, y - 3, 10, true);
    text("Rival", rivalX, y - 3, 10, true);
    y = Math.max(
      tableRow(ownHead, ownWidths, 14, y, { header: true, height: 10, size: 8 }),
      tableRow(rivalHead, rivalWidths, rivalX, y, { header: true, height: 10, size: 8 }),
    );
  };
  rosterHeader();
  for (let i = 0; i < Math.max(a.players.length, rivalCaps.length); i++) {
    const p = a.players[i];
    const cap = rivalCaps[i];
    const t = cap === undefined ? null : playerTotals(sheet, "them", cap);
    const own = p
      ? [
          String(p.cap),
          p.name,
          String(p.totals.goals),
          String(p.totals.shots),
          String(p.totals.assists),
          String(p.expulsions),
          String(p.totals.penaltiesCommitted),
          String(p.totals.goalsExtra),
          ...(penaltyGoalColumn ? [String(p.shooting.penaltyGoals)] : []),
          ...(ownCards ? [cards(p.totals.yellow, p.totals.red)] : []),
        ]
      : ownHead.map(() => "");
    const rival = t
      ? [
          String(cap),
          String(t.goals),
          String(t.exclusions - t.penaltiesCommitted),
          String(t.penaltiesCommitted),
          ...(rivalCards ? [cards(t.yellow, t.red)] : []),
        ]
      : rivalHead.map(() => "");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const h = Math.max(
      6.7,
      ...own.map(
        (v, j) => (doc.splitTextToSize(v, ownWidths[j] - 3) as string[]).length * 3.51 + 3,
      ),
      ...rival.map(
        (v, j) => (doc.splitTextToSize(v, rivalWidths[j] - 3) as string[]).length * 3.51 + 3,
      ),
    );
    if (y + h > bottom()) {
      y = newPage("Convocatoria", "landscape") + 5;
      rosterHeader();
    }
    tableRow(own, ownWidths, 14, y, {
      left: [1],
      cap: Boolean(p),
      quiet: true,
      striped: i % 2 === 1,
      height: h,
      size: 9,
    });
    tableRow(rival, rivalWidths, rivalX, y, {
      cap: Boolean(t),
      quiet: true,
      striped: i % 2 === 1,
      height: h,
      size: 9,
    });
    y += h;
  }
  y += 5;
  const kw = [12, 46, 22, 22, 22, 27];
  const keeperRows = keeperPlayers.map((p) => [
    String(p.cap),
    p.name,
    String(p.totals.received),
    String(p.totals.saves),
    String(p.totals.conceded),
    String(p.quarters.length),
  ]);
  if (keeperRows.length < 2)
    keeperRows.push([
      "-",
      keeperRows.length ? "Sin segundo portero registrado" : "Sin portero registrado",
      "-",
      "-",
      "-",
      "-",
    ]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const kh = keeperRows.map((row) =>
    Math.max(
      7,
      ...row.map((v, j) => (doc.splitTextToSize(v, kw[j] - 3) as string[]).length * 3.12 + 3),
    ),
  );
  const footerSpace = 29 + kh.reduce((sum, h) => sum + h, 0) + (a.imported ? 5 : 0);
  if (y + footerSpace > bottom()) y = newPage("Portería y resultado", "landscape");
  text("Portería", 14, y, 11, true);
  text("Resultado por cuartos", 173, y, 11, true);
  let ky = tableRow(
    ["Gorro", "Portero", "Recibidos", "Parados", "Encajados", "Cuartos jugados"],
    kw,
    14,
    y + 3,
    { header: true, height: 8, size: 8, singleLine: [5] },
  );
  keeperRows.forEach((row, i) => {
    ky = tableRow(row, kw, 14, ky, {
      cap: row[0] !== "-",
      left: [1],
      quiet: true,
      striped: i % 2 === 1,
      height: kh[i],
      size: 8,
    });
  });
  const baseColumn = a.baseUs > 0 || a.baseThem > 0;
  const pw = [
    20,
    ...Array.from(
      { length: sheet.periods + (baseColumn ? 1 : 0) },
      () => 75 / (sheet.periods + (baseColumn ? 1 : 0)),
    ),
    15,
  ];
  let py = tableRow(
    [
      "Cuarto",
      ...(baseColumn ? ["Previo"] : []),
      ...Array.from({ length: sheet.periods }, (_, i) => String(i + 1)),
      "Final",
    ],
    pw,
    173,
    y + 3,
    { header: true, height: 8, size: 8 },
  );
  py = tableRow(
    [
      "Morvedre",
      ...(baseColumn ? [String(a.baseUs)] : []),
      ...Array.from({ length: sheet.periods }, (_, i) =>
        a.periods[i] ? String(a.periods[i].us) : "-",
      ),
      String(a.goalsUs),
    ],
    pw,
    173,
    py,
    { height: 7, size: 8, emphasis: [pw.length - 1], highlight: [pw.length - 1] },
  );
  py = tableRow(
    [
      "Rival",
      ...(baseColumn ? [String(a.baseThem)] : []),
      ...Array.from({ length: sheet.periods }, (_, i) =>
        a.periods[i] ? String(a.periods[i].them) : "-",
      ),
      String(a.goalsThem),
    ],
    pw,
    173,
    py,
    { height: 7, size: 8, striped: true, emphasis: [pw.length - 1], highlight: [pw.length - 1] },
  );
  y = Math.max(ky, py) + 5;
  const time = new Date(record.date).toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });
  const location = [record.venue, competition, role].filter(Boolean).join(" · ");
  doc.setFontSize(9);
  const locHeight = (doc.splitTextToSize(location, 198) as string[]).length * 3.78;
  const ribbonHeight = Math.max(17, locHeight + 9);
  if (y + ribbonHeight > bottom()) y = newPage("Datos del partido", "landscape");
  fill(14, y, 269, ribbonHeight, WHITE);
  doc.setDrawColor(...resultColor);
  doc.setLineWidth(0.4);
  doc.rect(14, y, 269, ribbonHeight);
  fill(14, y, 55, ribbonHeight, resultColor);
  text(resultLabel, 41.5, y + ribbonHeight / 2 + 1.8, 15, true, WHITE, "center");
  text(`${date} · ${time}`, 75, y + 6, 10, true);
  wrap(location, 75, y + 12, 202, 9, NAVY);

  newPage("Lectura del partido");
  const comparisons: [string, number, number][] = [
    ["Goles", a.goalsUs, a.goalsThem],
    ["Tiros totales", a.ownShooting.attempts + a.baseUs, a.rivalShots],
    ["Tiros fallados", a.ownShooting.misses, a.rivalMisses],
    ["Expulsiones", a.count("us", "exclusion"), a.count("them", "exclusion")],
    ["Penaltis cometidos", a.count("us", "penalty"), a.count("them", "penalty")],
    ["Tiempos muertos", a.count("us", "timeout"), a.count("them", "timeout")],
  ];
  const yellows = [
    a.count("us", "yellow", "coach_yellow"),
    a.count("them", "yellow", "coach_yellow"),
  ];
  const reds = [a.count("us", "red", "coach_red"), a.count("them", "red", "coach_red")];
  if (yellows[0] + yellows[1])
    comparisons.push(["Amarillas", ...yellows] as [string, number, number]);
  if (reds[0] + reds[1]) comparisons.push(["Rojas", ...reds] as [string, number, number]);
  text("MORVEDRE", 78, 32, 9, true, BLUE, "center");
  text("RIVAL", 184, 32, 9, true, ORANGE, "center");
  comparisons.forEach(([label, us, them], i) => {
    const cy = 39 + i * 7.7;
    text(label, 14, cy + 2.4, 9, true);
    text(String(us), 79, cy + 2.4, 11, true, BLUE, "right");
    fill(84, cy - 1.5, 91, 5, [222, 229, 235]);
    if (us + them) {
      const share = (us / (us + them)) * 91;
      if (us) fill(84, cy - 1.5, share, 5, BLUE);
      if (them) fill(84 + share, cy - 1.5, 91 - share, 5, ORANGE);
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.35);
      doc.line(84 + share, cy - 1.5, 84 + share, cy + 3.5);
    }
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.35);
    doc.rect(84, cy - 1.5, 91, 5);
    text(String(them), 180, cy + 2.4, 11, true, ORANGE, "left");
  });
  y = 39 + comparisons.length * 7.7 + 6;
  const shots = a.ownShooting;
  const penaltyAttempts = shots.penaltyGoals + shots.penaltyMisses;
  const outlinedBar = (x: number, by: number, w: number, value: number, total: number) => {
    fill(x, by, w, 4, [183, 197, 210]);
    if (value > 0 && total > 0) fill(x, by, w * Math.min(1, value / total), 4, BLUE);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.25);
    doc.rect(x, by, w, 4);
  };
  const metric = (
    x: number,
    my: number,
    w: number,
    title: string,
    value: number,
    total: number,
    detail: string,
  ) => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.rect(x, my, w, 29);
    text(title, x + 4, my + 6, 10, true);
    text(pct(total ? (value / total) * 100 : null), x + 4, my + 17, 24, true, BLUE);
    text(`${value} de ${total}`, x + w - 4, my + 16, 14, true, NAVY, "right");
    text(detail, x + w - 4, my + 21, 8.5, true, NAVY, "right");
    outlinedBar(x + 4, my + 24, w - 8, value, total);
  };
  metric(
    14,
    y,
    penaltyAttempts ? 88 : 182,
    "GOLES DE 1+ / SUPERIORIDAD",
    a.extraGoals,
    a.extraOpportunities,
    "expulsiones rivales",
  );
  if (penaltyAttempts)
    metric(
      108,
      y,
      88,
      "PENALTIS MARCADOS",
      shots.penaltyGoals,
      penaltyAttempts,
      "penaltis lanzados",
    );
  y += 39;
  fill(14, y, 182, 11, NAVY);
  text("Nuestros lanzamientos", 18, y + 7.5, 16, true, WHITE);
  text(`${shots.attempts} tiros`, 192, y + 7.5, 13, true, WHITE, "right");
  const shotRows: [string, number][] = [
    ["ACIERTO DE TIRO", shots.goals],
    ["A PORTERÍA", shots.onTarget],
    ["FUERA O PALO", shots.outside],
  ];
  shotRows.forEach(([label, value], i) => {
    const x = 14 + i * 62;
    const sy = y + 11;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.rect(x, sy, 58, 37);
    text(label, x + 4, sy + 7, 10, true);
    text(
      pct(shots.attempts ? (value / shots.attempts) * 100 : null),
      x + 4,
      sy + 19,
      24,
      true,
      BLUE,
    );
    text(
      i === 0 ? `${value} goles / ${shots.attempts} tiros` : `${value} de ${shots.attempts} tiros`,
      x + 4,
      sy + 27,
      11,
      true,
    );
    outlinedBar(x + 4, sy + 31, 50, value, shots.attempts);
  });
  if (shots.unclassified) {
    fill(14, y + 49, 182, 8, PALE);
    text(
      `Destino sin detallar: ${shots.unclassified} ${shots.unclassified === 1 ? "tiro" : "tiros"} (${shots.unclassified === 1 ? "penalti fallado" : "penaltis fallados"})`,
      18,
      y + 54.5,
      9,
      true,
    );
  }
  y += shots.unclassified ? 66 : 57;
  text("Así fue el marcador", 14, y, 15, true);
  const highestScore = Math.max(1, a.goalsUs, a.goalsThem);
  const tick = Math.max(1, 2 ** Math.ceil(Math.log2(highestScore / 4)));
  const max = Math.max(tick, Math.ceil(highestScore / tick) * tick);
  const graphTop = y + 9,
    graphBottom = Math.min(266, graphTop + 43),
    graphHeight = graphBottom - graphTop;
  const gx = (position: number) => 25 + (position / Math.max(1, a.periods.length)) * 159;
  for (let value = 0; value <= max; value += tick) {
    const f = value / max;
    line(25, graphBottom - graphHeight * f, 159);
    text(String(value), 21, graphBottom - graphHeight * f + 1, 8, false, NAVY, "right");
  }
  for (const period of a.periods) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(gx(period.period), graphTop, gx(period.period), graphBottom);
  }
  for (const [key, color] of [
    ["us", BLUE],
    ["them", ORANGE],
  ] as const) {
    const series = a.goalProgression.filter(
      (point, i, points) => point.quarter !== null || i === 0 || point[key] !== points[i - 1][key],
    );
    const slopes = series
      .slice(1)
      .map((point, i) => (point[key] - series[i][key]) / (point.position - series[i].position));
    const tangent = (i: number) => {
      if (i === 0) return slopes[0] ?? 0;
      if (i === series.length - 1) return slopes[i - 1] ?? 0;
      const before = slopes[i - 1],
        after = slopes[i];
      return before > 0 && after > 0 ? (2 * before * after) / (before + after) : 0;
    };
    series.forEach((point, i) => {
      const px = gx(point.position),
        py = graphBottom - (point[key] / max) * graphHeight;
      doc.setDrawColor(...color);
      doc.setFillColor(...color);
      doc.setLineWidth(0.8);
      if (i) {
        const prev = series[i - 1];
        const prevY = graphBottom - (prev[key] / max) * graphHeight;
        const dx = px - gx(prev.position);
        const dy = py - prevY;
        const scale = ((point.position - prev.position) * graphHeight) / max / 3;
        doc.lines(
          [[dx / 3, -tangent(i - 1) * scale, (dx * 2) / 3, dy + tangent(i) * scale, dx, dy]],
          gx(prev.position),
          prevY,
          [1, 1],
          "S",
        );
      }
      if (point.quarter === null) doc.circle(px, py, 0.65, "F");
      if (point.quarter !== null) {
        doc.circle(px, py, 1.1, "F");
        text(
          String(point[key]),
          px,
          py + (point.us >= point.them === (key === "us") ? -3 : 5),
          9,
          true,
          color,
          "center",
        );
      }
    });
  }
  text("Inicio", 25, graphBottom + 10, 8, true, NAVY, "center");
  a.periods.forEach((p) =>
    text(`${p.period}º cuarto`, gx(p.period), graphBottom + 10, 8, true, NAVY, "center"),
  );

  y = newPage("Aportación individual");
  const participants = a.players
    .filter((p) => p.contribution > 0 || p.shooting.attempts > 0)
    .sort(
      (p, q) => q.contribution - p.contribution || q.totals.goals - p.totals.goals || p.cap - q.cap,
    );
  const iw = [12, 66, 18, 16, 24, 24, 22];
  const ih = [
    "Gorro",
    "Jugador",
    "Goles",
    "Tiros",
    "Asistencias",
    "Goles + asistencias",
    "% de acierto",
  ];
  y = tableRow(ih, iw, 14, y, { header: true, height: 10, size: 8.5 });
  participants.forEach((p, i) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const h = Math.max(7.2, (doc.splitTextToSize(p.name, 63) as string[]).length * 3.51 + 3);
    if (y + h > bottom()) {
      y = newPage("Aportación individual");
      y = tableRow(ih, iw, 14, y, { header: true, height: 10, size: 8.5 });
    }
    y = tableRow(
      [
        String(p.cap),
        p.name,
        String(p.totals.goals),
        String(p.shooting.attempts),
        String(p.totals.assists),
        String(p.contribution),
        p.shooting.attempts ? pct(p.shooting.accuracy) : "-",
      ],
      iw,
      14,
      y,
      {
        cap: true,
        left: [1],
        height: h,
        size: 9,
        quiet: true,
        striped: i % 2 === 1,
        emphasis: [5],
      },
    );
  });
  const otherPlayers = a.players.filter((p) => !participants.includes(p));
  if (otherPlayers.length) {
    y += 7;
    if (y + 15 > bottom()) y = newPage("Aportación individual");
    text("Sin goles, asistencias ni tiros", 14, y, 9, true);
    y += 5;
    for (let i = 0; i < otherPlayers.length; i += 3) {
      const group = otherPlayers.slice(i, i + 3);
      doc.setFontSize(8);
      const nameRows = group.map((p) => doc.splitTextToSize(p.name, 49) as string[]);
      const h = Math.max(6, ...nameRows.map((rows) => rows.length * 3.2 + 2));
      if (y + h > bottom()) y = newPage("Aportación individual");
      group.forEach((p, j) => {
        const x = 14 + j * 62;
        fill(x, y, 7, h, PALE);
        text(String(p.cap), x + 3.5, y + 4, 8, true, NAVY, "center");
        nameRows[j].forEach((name, row) => text(name, x + 9, y + 4 + row * 3.2, 8));
      });
      y += h + 1;
    }
  }
  y += 10;
  if (y + 64 > bottom()) y = newPage("Nuestra portería");
  else {
    text("Nuestra portería", 14, y, 16, true);
    y += 8;
  }
  for (const p of keeperPlayers) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(p.name, 100) as string[];
    const nameHeight = Math.max(17, nameLines.length * 4.2 + 5);
    const h = nameHeight + 18;
    if (y + h > bottom()) y = newPage("Nuestra portería");
    fill(14, y, 182, nameHeight, NAVY);
    text(String(p.cap), 20, y + 9, 15, true, WHITE);
    nameLines.forEach((name, i) => text(name, 30, y + 8 + i * 4.2, 11, true, WHITE));
    text(`${p.quarters.length} cuartos jugados`, 192, y + 6, 9, true, WHITE, "right");
    for (let q = 1; q <= sheet.periods; q++) {
      const active = p.quarters.includes(q);
      const x = 192 - (sheet.periods - q + 1) * 6;
      fill(x, y + 9, 5, 5, active ? WHITE : BLUE);
      text(`${q}º`, x + 2.5, y + 12.6, 8, active, active ? NAVY : WHITE, "center");
    }
    const cells = [
      [String(p.totals.received), "Recibidos"],
      [String(p.totals.saves), "Parados"],
      [String(p.totals.conceded), "Encajados"],
      [pct(p.saveRate), "% de paradas"],
      [String(p.totals.penaltySaves), "Penaltis parados"],
      [
        p.concededPerQuarter === null ? "-" : p.concededPerQuarter.toFixed(1).replace(".", ","),
        "Goles por cuarto",
      ],
    ];
    cells.forEach(([value, label], i) => {
      const x = 14 + i * (182 / 6);
      text(value, x + 182 / 12, y + nameHeight + 9, 18, true, i === 3 ? BLUE : NAVY, "center");
      text(label, x + 182 / 12, y + nameHeight + 16, 8, true, NAVY, "center");
      if (i) {
        doc.setDrawColor(...LINE);
        doc.line(x, y + nameHeight + 3, x, y + nameHeight + 18);
      }
    });
    line(14, y + h, 182);
    y += h + 3;
  }
  if (!keeperPlayers.length) {
    text("Sin portero registrado.", 14, y, 10);
    y += 10;
  }
  if (a.unassignedConceded + a.baseThem) {
    if (y + 10 > bottom()) y = newPage("Nuestra portería");
    text(`Goles sin portero asignado: ${a.unassignedConceded + a.baseThem}`, 14, y, 9);
    y += 9;
  }
  if (!sheet.keeperStints?.length && keeperPlayers.length) {
    if (y + 10 > bottom()) y = newPage("Nuestra portería");
    text("Cuartos conocidos por intervenciones (acta anterior).", 14, y, 9);
    y += 9;
  }
  if (a.rivalScorers.length) {
    if (y + 22 > bottom()) y = newPage("Goleadores rivales");
    else {
      text("Goleadores rivales", 14, y + 4, 13, true);
      text("Goles · % del total rival", 196, y + 4, 8, false, NAVY, "right");
      y += 8;
    }
    const widths = [23, 20, 45];
    const groups = a.rivalScorers.length > 7 ? 2 : 1;
    const perGroup = Math.ceil(a.rivalScorers.length / groups);
    const rivalHeader = () => {
      for (let j = 0; j < groups; j++)
        tableRow(["Número", "Goles", "% de goles del equipo"], widths, 14 + j * 94, y, {
          header: true,
          height: 7,
          size: 8,
        });
      y += 7;
    };
    rivalHeader();
    for (let i = 0; i < perGroup; i++) {
      if (y + 6.2 > bottom()) {
        y = newPage("Goleadores rivales");
        rivalHeader();
      }
      for (let j = 0; j < groups; j++) {
        const p = a.rivalScorers[j * perGroup + i];
        if (p)
          tableRow([String(p.cap), String(p.goals), pct(p.share)], widths, 14 + j * 94, y, {
            height: 6.2,
            size: 8,
            striped: i % 2 === 1,
            emphasis: [1],
          });
      }
      y += 6.2;
    }
  }
  y = newPage("El partido, cuarto a cuarto");
  const labels: Partial<Record<ActionKind, string>> = {
    goal: "Gol",
    goal_extra: "Gol de 1+",
    goal_penalty: "Gol de penalti",
    exclusion: "Expulsión",
    penalty: "Penalti cometido",
    yellow: "Amarilla",
    red: "Roja",
    coach_yellow: "Amarilla al entrenador",
    coach_red: "Roja al entrenador",
    timeout: "Tiempo muerto",
    penalty_missed: "Penalti fallado",
    penalty_save: "Penalti parado",
  };
  if (a.imported) {
    text(`Marcador al iniciar el registro: ${a.baseUs} - ${a.baseThem}`, 14, y, 9, true);
    y += 8;
  }
  if (!a.periods.length) text("El partido todavía no ha empezado.", 14, y, 11);
  const timeWidths = [20, 20, 62, 80];
  const timeHead = ["Marcador", "Equipo", "Jugador", "Qué ha pasado"];
  const quarterHeader = (period: (typeof a.periods)[number], continuation = false) => {
    fill(14, y, 182, 17, NAVY);
    text(
      `${period.period}º CUARTO${continuation ? " · continúa" : ""}`,
      18,
      y + 7,
      12,
      true,
      WHITE,
    );
    text(`En este cuarto: ${period.us} - ${period.them}`, 18, y + 13, 9, false, WHITE);
    text("MARCADOR GLOBAL", 192, y + 5, 7.5, true, WHITE, "right");
    text(
      `${period.cumulativeUs} - ${period.cumulativeThem}`,
      192,
      y + 13,
      19,
      true,
      WHITE,
      "right",
    );
    y += 20;
  };
  for (const period of a.periods) {
    const rows = a.events.filter((e) => e.period === period.period && labels[e.kind]);
    if (y + 36 > bottom()) y = newPage("El partido, cuarto a cuarto");
    quarterHeader(period);
    if (!rows.length) {
      text("Sin acciones destacadas registradas.", 14, y + 3, 9);
      y += 13;
      continue;
    }
    y = tableRow(timeHead, timeWidths, 14, y, { header: true, height: 8, size: 8 });
    for (const [rowIndex, event] of rows.entries()) {
      const before = a.events.slice(0, a.events.indexOf(event) + 1);
      const us = a.baseUs + before.filter((e) => e.side === "us" && isGoal(e.kind)).length;
      const them = a.baseThem + before.filter((e) => e.side === "them" && isGoal(e.kind)).length;
      const who =
        event.cap === null
          ? "Banquillo"
          : event.side === "them"
            ? `Gorro ${event.cap}`
            : `${event.cap}  ${a.players.find((p) => p.cap === event.cap)?.name ?? "Jugador"}`;
      const assist = a.events.find(
        (e) => e.kind === "assist" && e.side === "us" && e.related_event_id === event.id,
      );
      const action =
        event.kind === "goal" && event.origin === "penalty_flow"
          ? "Gol de penalti"
          : event.kind === "penalty_missed" && event.missOutcome
            ? event.missOutcome === "out"
              ? "Penalti fuera / palo"
              : "Penalti parado por el rival"
            : labels[event.kind]!;
      const detail = `${action}${assist ? ` · Asistencia: ${assist.cap} ${a.players.find((p) => p.cap === assist.cap)?.name ?? ""}` : ""}`;
      const values = [
        isGoal(event.kind) ? `${us} - ${them}` : "-",
        event.side === "us" ? "Morvedre" : "Rival",
        who,
        detail,
      ];
      doc.setFont("helvetica", isGoal(event.kind) ? "bold" : "normal");
      doc.setFontSize(8);
      const h = Math.max(
        7,
        ...values.map(
          (v, i) => (doc.splitTextToSize(v, timeWidths[i] - 3) as string[]).length * 3.12 + 3,
        ),
      );
      if (y + h > bottom()) {
        y = newPage("El partido, cuarto a cuarto");
        quarterHeader(period, true);
        y = tableRow(timeHead, timeWidths, 14, y, { header: true, height: 8, size: 8 });
      }
      const color = event.side === "us" ? BLUE : ORANGE;
      const startY = y;
      y = tableRow(values, timeWidths, 14, y, {
        left: [2, 3],
        striped: rowIndex % 2 === 1,
        accent: color,
        height: h,
      });
      fill(14, startY, 1.2, y - startY, color);
      if (isGoal(event.kind)) {
        fill(14, startY, 20, y - startY, color);
        text(`${us} - ${them}`, 24, startY + (y - startY) / 2 + 1, 10, true, WHITE, "center");
      }
    }
    y += 8;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    line(14, h - 10, w - 28);
    text("Morvedre Core", 14, h - 5, 8, true, BLUE);
    text(`${page} / ${pages}`, w - 14, h - 5, 8, true, NAVY, "right");
  }
  return new File(
    [doc.output("arraybuffer")],
    `acta-${record.date.slice(0, 10)}-${slug(record.team)}-${slug(record.opponent)}.pdf`,
    { type: "application/pdf" },
  );
}

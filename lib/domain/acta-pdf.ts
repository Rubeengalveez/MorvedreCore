import { jsPDF } from "jspdf";
import { describeEvent, playerTotals, score, type LiveRecord } from "./live-match";

export function createActaPdf(record: LiveRecord) {
  const doc = new jsPDF();
  const s = record.sheet;
  let y = 0;
  let page = 0;
  function header() {
    page++;
    doc.setFillColor(6, 32, 72);
    doc.rect(0, 0, 210, 39, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("MORVEDRE CORE", 14, 15);
    doc.setFontSize(11);
    doc.text(s.phase === "finished" ? "ACTA DE PARTIDO" : "ACTA PROVISIONAL", 14, 23);
    doc.setFontSize(10);
    doc.text(`Página ${page}`, 178, 15);
    doc.setFontSize(15);
    doc.text(`Morvedre ${score(s, "us")} - ${score(s, "them")} Rival`, 14, 33);
    doc.setTextColor(6, 32, 72);
    y = 49;
  }
  function room(height = 8) {
    if (y + height > 280) {
      doc.addPage();
      header();
    }
  }
  function line(text: string, bold = false, size = 11) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 182) as string[];
    for (const l of lines) {
      room(7);
      doc.text(l, 14, y);
      y += 6;
    }
    y += 2;
  }
  function section(title: string) {
    room(20);
    y += 4;
    doc.setDrawColor(180, 198, 215);
    doc.line(14, y - 3, 196, y - 3);
    line(title, true, 13);
  }
  header();
  line(`${record.team} contra ${record.opponent}`, true);
  line(
    new Date(record.date).toLocaleDateString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
  if (record.dirty) line("Incluye jugadas pendientes de sincronizar.");
  if (s.baselineThem || s.baseline.some((p) => p.goals || p.exclusions))
    line("Registro parcial: hay totales previos sin periodo ni detalle de jugada.");
  section("Parciales");
  line(
    Array.from(
      { length: s.period },
      (_, i) => `P${i + 1}: ${score(s, "us", i + 1)}-${score(s, "them", i + 1)}`,
    ).join("    |    "),
  );
  for (const side of ["us", "them"] as const) {
    section(side === "us" ? "Morvedre" : "Rival");
    const rows = side === "us" ? s.players : s.opponentCaps.map((cap) => ({ cap, name: "" }));
    room(12);
    doc.setFillColor(226, 239, 244);
    doc.rect(14, y - 5, 182, 9, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Gorro / jugador", 17, y);
    doc.text("Goles", 125, y);
    doc.text("Exp.", 147, y);
    doc.text("Tarjetas", 168, y);
    y += 9;
    for (const p of rows) {
      const t = playerTotals(s, side, p.cap);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const names = doc.splitTextToSize(`#${p.cap} ${p.name}`, 100) as string[];
      const height = Math.max(9, names.length * 5 + 3);
      room(height);
      names.forEach((n, i) => doc.text(n, 17, y + i * 5));
      doc.text(String(t.goals), 129, y);
      doc.text(`${t.exclusions}/3`, 147, y);
      doc.text(t.red ? "Roja" : t.yellow ? "Amarilla" : "-", 168, y);
      doc.setDrawColor(220, 228, 235);
      doc.line(14, y + height - 5, 196, y + height - 5);
      y += height;
    }
    const events = s.events.filter((e) => !e.deleted && e.side === side);
    line(
      `Tiempos muertos: ${
        events
          .filter((e) => e.kind === "timeout")
          .map((e) => `P${e.period}`)
          .join(", ") || "0"
      }`,
    );
    line(
      `Entrenador: ${events.some((e) => e.kind === "coach_red") ? "tarjeta roja" : events.some((e) => e.kind === "coach_yellow") ? "tarjeta amarilla" : "sin tarjetas"}`,
    );
  }
  section("Detalle de Morvedre");
  for (const p of s.players) {
    const t = playerTotals(s, "us", p.cap);
    line(`#${p.cap} ${p.name}: ${t.shots} tiros registrados, ${t.goals} goles.`, false, 10);
  }
  section("Portería de Morvedre");
  for (const p of s.players.filter(
    (p) =>
      p.cap === 1 ||
      p.cap === 13 ||
      s.events.some(
        (e) =>
          e.keeper === p.cap ||
          (e.cap === p.cap && (e.kind === "save" || e.kind === "penalty_save")),
      ),
  )) {
    const t = playerTotals(s, "us", p.cap);
    line(
      `#${p.cap} ${p.name}: ${t.saves} paradas, ${t.conceded} encajados, ${t.received} recibidos a puerta.`,
      false,
      10,
    );
  }
  section("Jugadas por periodo");
  for (const e of s.events.filter((e) => !e.deleted).sort((a, b) => a.period - b.period))
    line(`P${e.period} - ${describeEvent(e, s).replace(/·/g, "-")}`, false, 10);
  return new File([doc.output("arraybuffer")], `acta-morvedre-${record.date.slice(0, 10)}.pdf`, {
    type: "application/pdf",
  });
}

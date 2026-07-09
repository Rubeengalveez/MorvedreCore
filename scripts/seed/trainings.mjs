import { admin, loadBatch, mergeBatch, rand, randInt, pad2, isoDate, resetRng } from "./base.mjs";
import { randomUUID } from "node:crypto";

async function main() {
  resetRng();
  console.log("[trainings] Generando bloques y sesiones de entrenamiento...\n");

  const batch = loadBatch() ?? {};
  const teamIdByLabel = new Map(Object.entries(batch.teamIdByLabel ?? {}));
  const playerIdsByTeam = batch.playerIdByTeamLabel ?? {};

  if (teamIdByLabel.size === 0) {
    console.log("[trainings] No hay equipos. Ejecuta primero: node scripts/seed/players.mjs");
    return;
  }

  const blockIds = [];
  const sessionIds = [];
  const attendance = [];
  const now = new Date();

  for (const [label, teamId] of teamIdByLabel) {
    const players = (playerIdsByTeam[label] ?? []).map((id) => ({ id }));
    if (players.length === 0) continue;

    const blockDefs = [
      { startMonth: 8, endMonth: 1, days: [1, 3], hour: 17 },
      { startMonth: 1, endMonth: 6, days: [2, 4], hour: 18 },
    ];
    for (const def of blockDefs) {
      const blockId = randomUUID();
      const start = new Date(Date.UTC(2025, def.startMonth, 1));
      const end = new Date(Date.UTC(2026, def.endMonth, 0));
      const { error: bErr } = await admin.from("training_blocks").upsert({
        id: blockId, team_id: teamId, label: `Temporada ${label} (${def.startMonth + 1}-${def.endMonth + 1})`,
        weekdays: def.days,
        start_date: isoDate(start), end_date: isoDate(end),
        start_time: `${pad2(def.hour)}:00`, end_time: `${pad2(def.hour + 1)}:30`,
        kind: label === "Escuela" ? "mixed" : "water",
        is_active: true, created_by: null,
      }, { onConflict: "id" });
      if (bErr) {
        console.error(`  ! Bloque ${label}: ${bErr.message}`);
        continue;
      }
      blockIds.push(blockId);

      for (let d = new Date(start); d <= end && d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
        const dow = d.getUTCDay();
        const monFirst = dow === 0 ? 7 : dow;
        if (!def.days.includes(monFirst)) continue;
        if (rand() < 0.10) continue;

        const sessionId = randomUUID();
        const hour = def.hour;
        const { error: sErr } = await admin.from("training_sessions").upsert({
          id: sessionId, block_id: blockId, team_id: teamId,
          scheduled_at: `${isoDate(d)}T${pad2(hour)}:00:00Z`,
          duration_minutes: 90,
          location: "Piscina Municipal Puerto Sagunto",
          notes: null,
          cancelled: false,
        }, { onConflict: "id" });
        if (sErr) continue;
        sessionIds.push(sessionId);

        for (const p of players) {
          const r = rand();
          if (r < 0.80) {
            attendance.push({
              session_id: sessionId, player_id: p.id, present: true,
              reason: null, marked_by: null, marked_at: d.toISOString(),
            });
          } else if (r < 0.95) {
            attendance.push({
              session_id: sessionId, player_id: p.id, present: false,
              reason: randPickReason(), marked_by: null, marked_at: d.toISOString(),
            });
          } else {
            attendance.push({
              session_id: sessionId, player_id: p.id, present: true,
              reason: null, marked_by: null, marked_at: d.toISOString(),
            });
          }
        }
      }
    }
  }
  console.log(`[trainings] ${sessionIds.length} sesiones`);

  console.log(`[trainings] Insertando ${attendance.length} registros de asistencia...`);
  for (let i = 0; i < attendance.length; i += 300) {
    const chunk = attendance.slice(i, i + 300);
    const { error } = await admin.from("training_attendance").upsert(chunk, {
      onConflict: "session_id,player_id",
    });
    if (error) console.error(`  ! Bloque ${i / 300 + 1}: ${error.message}`);
  }

  mergeBatch({ trainingBlockIds: blockIds, trainingSessionIds: sessionIds });
  console.log(`\n[trainings] OK! ${sessionIds.length} sesiones, ${attendance.length} registros.`);
  console.log("  Siguiente paso: node scripts/seed/matches.mjs");
}

function randPickReason() {
  const reasons = ["Lesión", "Viaje familiar", "Estudios", "Examen", "Enfermedad", "Médico", "Vacaciones", "Trabajo", "Cumpleaños"];
  return reasons[Math.floor(rand() * reasons.length)];
}

main().catch((err) => {
  console.error("[trainings] FATAL:", err);
  process.exit(1);
});

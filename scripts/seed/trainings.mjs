import { admin, loadBatch, mergeBatch, rand, pad2, isoDate, resetRng } from "./base.mjs";
import { randomUUID } from "node:crypto";

const clubDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function clubTimeToUtc(date, hour) {
  const wallClockAsUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hour,
  );
  const offsetAt = (value) => {
    const parts = clubDateTimeFormatter.formatToParts(value);
    const part = (type) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    return (
      Date.UTC(
        part("year"),
        part("month") - 1,
        part("day"),
        part("hour"),
        part("minute"),
        part("second"),
      ) - value.getTime()
    );
  };
  const first = new Date(wallClockAsUtc - offsetAt(new Date(wallClockAsUtc)));
  return new Date(wallClockAsUtc - offsetAt(first));
}

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
  const schedules = {
    Benjamín: { days: [1, 3], hour: 17 },
    Alevín: { days: [2, 4], hour: 17 },
    Infantil: { days: [1, 3, 5], hour: 18 },
    "Cadete A": { days: [2, 4, 5], hour: 19 },
    "Cadete B": { days: [1, 3, 5], hour: 19 },
    Juvenil: { days: [1, 3, 5], hour: 20 },
    Absoluto: { days: [2, 4, 5], hour: 20 },
    Escuela: { days: [2, 4], hour: 17 },
  };

  for (const [label, teamId] of teamIdByLabel) {
    const players = (playerIdsByTeam[label] ?? []).map((id) => ({ id }));
    if (players.length === 0) continue;

    const schedule = schedules[label] ?? { days: [2, 4], hour: 18 };
    const blockDefs = [{ start: "2025-09-01", end: "2026-07-31", ...schedule }];
    for (const def of blockDefs) {
      const blockId = randomUUID();
      const start = new Date(`${def.start}T00:00:00Z`);
      const end = new Date(`${def.end}T00:00:00Z`);
      const { error: bErr } = await admin.from("training_blocks").upsert(
        {
          id: blockId,
          team_id: teamId,
          label: `Temporada 2025/2026 · ${label}`,
          weekdays: def.days,
          start_date: isoDate(start),
          end_date: isoDate(end),
          start_time: `${pad2(def.hour)}:00`,
          end_time: `${pad2(def.hour + 1)}:30`,
          kind: label === "Escuela" ? "mixed" : "water",
          is_active: true,
          created_by: null,
        },
        { onConflict: "id" },
      );
      if (bErr) {
        console.error(`  ! Bloque ${label}: ${bErr.message}`);
        continue;
      }
      blockIds.push(blockId);

      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const dow = d.getUTCDay();
        const monFirst = dow === 0 ? 7 : dow;
        if (!def.days.includes(monFirst)) continue;

        const sessionId = randomUUID();
        const hour = def.hour;
        const scheduledAt = clubTimeToUtc(d, hour);
        const isPast = scheduledAt < now;
        const cancelled = rand() < 0.04;
        const { error: sErr } = await admin.from("training_sessions").upsert(
          {
            id: sessionId,
            block_id: blockId,
            team_id: teamId,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: 90,
            location: "Piscina Municipal Puerto Sagunto",
            notes: cancelled ? "Sesión cancelada por mantenimiento de la piscina." : null,
            cancelled,
          },
          { onConflict: "id" },
        );
        if (sErr) continue;
        sessionIds.push(sessionId);

        if (!isPast || cancelled) continue;
        for (const p of players) {
          const r = rand();
          if (r < 0.84) {
            attendance.push({
              session_id: sessionId,
              player_id: p.id,
              present: true,
              reason: null,
              marked_by: null,
              marked_at: new Date(scheduledAt.getTime() + 90 * 60_000).toISOString(),
            });
          } else if (r < 0.97) {
            attendance.push({
              session_id: sessionId,
              player_id: p.id,
              present: false,
              reason: randPickReason(),
              marked_by: null,
              marked_at: new Date(scheduledAt.getTime() + 90 * 60_000).toISOString(),
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
  const reasons = [
    "Lesión",
    "Viaje familiar",
    "Estudios",
    "Examen",
    "Enfermedad",
    "Médico",
    "Vacaciones",
    "Trabajo",
    "Cumpleaños",
  ];
  return reasons[Math.floor(rand() * reasons.length)];
}

main().catch((err) => {
  console.error("[trainings] FATAL:", err);
  process.exit(1);
});

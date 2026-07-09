import { admin, loadBatch, mergeBatch, rand, randInt, pad2, resetRng } from "./base.mjs";

const REASONS = [
  "Examen", "Viaje familiar", "Lesión", "Médico", "Cumpleaños",
  "Boda", "Vacaciones", "Compromiso escolar", "Compromiso laboral del padre/madre",
  "Enfermedad", "Recuperación post-partido",
];

async function main() {
  resetRng();
  console.log("[availability] Generando fechas bloqueadas...\n");

  const batch = loadBatch() ?? {};
  const playerIds = batch.playerIds ?? [];

  if (playerIds.length === 0) {
    console.log("[availability] No hay jugadores. Ejecuta primero: node scripts/seed/players.mjs");
    return;
  }

  const now = new Date();
  const blocks = [];

  const seen = new Set();
  const candidates = playerIds.filter(() => rand() < 0.35);
  for (const pid of candidates) {
    const numBlocks = randInt(1, 3);
    for (let i = 0; i < numBlocks; i++) {
      const daysAhead = randInt(2, 60);
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + daysAhead);
      const isoDate = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
      const key = `${pid}|${isoDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const reason = REASONS[Math.floor(rand() * REASONS.length)];
      blocks.push({
        player_id: pid, date: isoDate, available: false, reason,
      });
    }
  }

  console.log(`[availability] ${blocks.length} bloqueos para ${candidates.length} jugadores`);
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    const { error } = await admin.from("match_availability").upsert(chunk, {
      onConflict: "player_id,date",
    });
    if (error) console.error(`  ! Bloque ${i / 100 + 1}: ${error.message}`);
  }

  mergeBatch({ availabilityBlocks: blocks.length });
  console.log(`\n[availability] OK! ${blocks.length} bloqueos.`);
  console.log("  Siguiente paso: node scripts/seed/recompute.mjs");
}

main().catch((err) => {
  console.error("[availability] FATAL:", err);
  process.exit(1);
});

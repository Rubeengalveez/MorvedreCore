import { admin, loadBatch, mergeBatch, rand, resetRng } from "./base.mjs";

async function main() {
  resetRng();
  console.log("[parent-child] Vinculando jugadores con sus padres/madres...\n");

  const batch = loadBatch() ?? {};
  const playerIdsByTeam = batch.playerIdByTeamLabel ?? {};
  const parentIds = batch.parentIds ?? [];

  if (parentIds.length === 0) {
    console.log("[parent-child] No hay padres. Ejecuta primero: node scripts/seed/players.mjs");
    return;
  }

  // Recoger todos los jugadores
  const allPlayers = [];
  for (const [label, ids] of Object.entries(playerIdsByTeam)) {
    if (["Juvenil", "Absoluto"].includes(label)) continue;
    for (const id of ids) allPlayers.push({ id, team: label });
  }
  console.log(
    `[parent-child] ${allPlayers.length} jugadores en ${Object.keys(playerIdsByTeam).length} equipos`,
  );

  // Vincular cada jugador menor con 1-2 padres
  const links = [];
  let padreIdx = 0;

  // Shuffle padres para distribución
  const shuffledParents = [...parentIds].sort(() => rand() - 0.5);

  for (const p of allPlayers) {
    if (rand() < 0.08) continue;

    const numParents = rand() < 0.7 ? 1 : 2;
    for (let i = 0; i < numParents; i++) {
      const parentId = shuffledParents[padreIdx % shuffledParents.length];
      padreIdx++;
      const relation = rand() < 0.5 ? "father" : "mother";
      links.push({
        parent_profile_id: parentId,
        child_profile_id: p.id,
        relation,
      });
    }
  }

  console.log(`[parent-child] ${links.length} vinculos a crear`);

  // Insertar en bloques de 200
  for (let i = 0; i < links.length; i += 200) {
    const chunk = links.slice(i, i + 200);
    const { error } = await admin.from("parent_child_links").upsert(chunk, {
      onConflict: "parent_profile_id,child_profile_id",
    });
    if (error) {
      throw error;
    } else {
      console.log(`  - Bloque ${i / 200 + 1}: ${chunk.length} vinculos`);
    }
  }

  mergeBatch({ parentChildLinks: links.length });

  console.log(`\n[parent-child] OK! ${links.length} vinculos creados.`);
  console.log("  Siguiente paso: node scripts/seed/trainings.mjs");
}

main().catch((err) => {
  console.error("[parent-child] FATAL:", err);
  process.exit(1);
});

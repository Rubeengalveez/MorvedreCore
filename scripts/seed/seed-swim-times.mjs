import { randomUUID } from "node:crypto";
import { admin } from "./base.mjs";

async function run() {
  console.log("🌊 Iniciando sembrado de tiempos de nado...");

  // 1. Obtener temporada actual
  const { data: season, error: seasonErr } = await admin
    .from("seasons")
    .select("id, label")
    .eq("is_current", true)
    .single();

  if (seasonErr || !season) {
    console.error("Error al obtener temporada activa:", seasonErr);
    process.exit(1);
  }
  console.log(`Temporada activa: ${season.label} (${season.id})`);

  // 2. Obtener admin / coach por defecto (Rubén Gálvez / perfil admin)
  const { data: adminRole, error: adminErr } = await admin
    .from("user_roles")
    .select("profile_id")
    .eq("role", "admin")
    .is("scope_team_id", null)
    .limit(1)
    .single();

  const creatorId = adminRole?.profile_id;
  if (!creatorId) {
    console.error("No se encontró el perfil de creador/admin:", adminErr);
    process.exit(1);
  }
  console.log(`Perfil creador/admin: ${creatorId}`);

  // 3. Obtener equipos y jugadores con plantilla en la temporada
  const { data: rosters, error: rosterErr } = await admin
    .from("team_rosters")
    .select("player_id, team_id, teams!team_rosters_team_id_fkey(id, label, category_code, team_type), profiles!team_rosters_player_id_fkey(id, full_name, birth_year)")
    .eq("teams.season_id", season.id)
    .is("left_at", null);

  if (rosterErr || !rosters) {
    console.error("Error al obtener plantillas:", rosterErr);
    process.exit(1);
  }

  console.log(`Encontrados ${rosters.length} registros en plantillas.`);

  // Fechas de las 3 tomas de la temporada
  const DATES = ["2025-10-15", "2025-12-10", "2026-02-18"];

  const entriesToInsert = [];
  let playerCount = 0;

  for (const r of rosters) {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const team = Array.isArray(r.teams) ? r.teams[0] : r.teams;
    if (!profile || !team) continue;

    playerCount++;
    const cat = team.category_code;

    // Rango de centésimas base por categoría
    let base50Cs = 3200; // 32s
    let base100Cs = 7200; // 1:12

    if (cat === "benjamin") {
      base50Cs = 4600 + (playerCount % 9) * 110;
      base100Cs = 10200 + (playerCount % 9) * 220;
    } else if (cat === "alevin") {
      base50Cs = 3900 + (playerCount % 9) * 90;
      base100Cs = 8800 + (playerCount % 9) * 180;
    } else if (cat === "infantil") {
      base50Cs = 3400 + (playerCount % 9) * 80;
      base100Cs = 7800 + (playerCount % 9) * 160;
    } else if (cat === "cadete") {
      base50Cs = 3050 + (playerCount % 9) * 70;
      base100Cs = 6900 + (playerCount % 9) * 140;
    } else if (cat === "juvenil") {
      base50Cs = 2850 + (playerCount % 9) * 60;
      base100Cs = 6400 + (playerCount % 9) * 120;
    } else if (cat === "absoluto") {
      base50Cs = 2700 + (playerCount % 9) * 55;
      base100Cs = 6100 + (playerCount % 9) * 110;
    } else {
      // escuela / otros
      base50Cs = 4800 + (playerCount % 7) * 100;
      base100Cs = 10800 + (playerCount % 7) * 200;
    }

    // Variación para 3 tomas:
    // Toma 1 (octubre): base
    // Toma 2 (diciembre): mejora (resta tiempo)
    // Toma 3 (febrero): si el índice es par, sigue mejorando; si es impar, empeora ligeramente (para que la mejor marca sea la toma 2 y la actual la toma 3)
    const deltaToma2 = 80 + (playerCount % 5) * 20; // mejora entre 0.8s y 1.6s
    const deltaToma3 = playerCount % 2 === 0
      ? deltaToma2 + 50 + (playerCount % 3) * 20 // sigue mejorando (actual == mejor)
      : deltaToma2 - (40 + (playerCount % 4) * 15); // decae un poco (mejor == toma 2, actual == toma 3)

    const t1_50 = base50Cs;
    const t1_100 = base100Cs;

    const t2_50 = base50Cs - deltaToma2;
    const t2_100 = base100Cs - deltaToma2 * 2;

    const t3_50 = base50Cs - deltaToma3;
    const t3_100 = base100Cs - deltaToma3 * 2;

    const tests = [
      { date: DATES[0], time50: t1_50, time100: t1_100 },
      { date: DATES[1], time50: t2_50, time100: t2_100 },
      { date: DATES[2], time50: t3_50, time100: t3_100 },
    ];

    for (const test of tests) {
      entriesToInsert.push({
        player_id: profile.id,
        team_id: team.id,
        season_id: season.id,
        test_date: test.date,
        time_50_cs: test.time50,
        time_100_cs: test.time100,
        operation_id: randomUUID(),
        created_by: creatorId,
        updated_by: creatorId,
        revision: 1,
      });
    }
  }

  console.log(`Insertando ${entriesToInsert.length} marcas de natación en lotes de 50...`);

  const CHUNK_SIZE = 50;
  for (let i = 0; i < entriesToInsert.length; i += CHUNK_SIZE) {
    const chunk = entriesToInsert.slice(i, i + CHUNK_SIZE);
    const { error: insertErr } = await admin.from("swim_time_entries").insert(chunk);
    if (insertErr) {
      console.error(`Error al insertar lote ${i}-${i + chunk.length}:`, insertErr);
      process.exit(1);
    }
  }

  console.log(`✅ ¡Éxito! Se han sembrado ${entriesToInsert.length} tiempos para ${playerCount} jugadores.`);
}

run().catch((err) => {
  console.error("Error fatal en sembrado:", err);
  process.exit(1);
});

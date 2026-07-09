import { createClient } from "@supabase/supabase-js";
import { recomputeSnapshotForPlayer } from "../server/actions/admin/rankings";
import { recomputeStreaksForMatch } from "../server/actions/admin/streaks";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Obtener temporada actual
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  if (!season) {
    console.error("No se encontró ninguna temporada activa.");
    return;
  }

  console.log(`Recomputando rankings y rachas para la temporada ${season.id}...`);

  // Obtener todos los jugadores
  const { data: players } = await supabase.from("profiles").select("id").eq("license_active", true);

  if (!players) {
    console.log("No se encontraron jugadores activos.");
    return;
  }

  // Primero, recalculamos las rachas de todos los partidos jugados
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("season_id", season.id)
    .eq("status", "played");

  if (matches && matches.length > 0) {
    console.log(`Recomputando rachas para ${matches.length} partidos...`);
    for (const match of matches) {
      try {
        await recomputeStreaksForMatch(match.id, supabase);
      } catch (err) {
        console.error(`Error recomputando rachas para el partido ${match.id}:`, err);
      }
    }
  }

  // Segundo, recalculamos los rankings / instantáneas de cada jugador
  console.log(`Recomputando instantáneas de rankings para ${players.length} jugadores...`);
  for (const player of players) {
    try {
      await recomputeSnapshotForPlayer(player.id, season.id);
    } catch (err) {
      console.error(`Error recomputando instantánea para el jugador ${player.id}:`, err);
    }
  }

  console.log("¡Recomputación completada con éxito!");
}

main().catch(console.error);

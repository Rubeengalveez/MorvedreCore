import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { recomputeSnapshotsForPlayers } from "../server/actions/admin/rankings";
import { recomputeStreaksForMatch } from "../server/actions/admin/streaks";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
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
    throw new Error("Faltan las credenciales de Supabase en el entorno");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();
  if (seasonError) throw seasonError;

  const [{ data: players, error: playersError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("license_active", true),
      supabase.from("matches").select("id").eq("season_id", season.id).eq("status", "played"),
    ]);
  if (playersError) throw playersError;
  if (matchesError) throw matchesError;

  console.log(`Recomputando rachas de ${matches.length} partidos...`);
  for (const match of matches) {
    await recomputeStreaksForMatch(match.id, supabase);
  }

  console.log(`Recomputando estadísticas de ${players.length} jugadores...`);
  await recomputeSnapshotsForPlayers(
    players.map((player) => player.id),
    season.id,
  );

  console.log("Recomputación completada");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

console.log("=== Limpiando snapshots duplicados ===");

const { data: players } = await admin
  .from("profiles")
  .select("id, full_name")
  .limit(500);
console.log("Players en DB:", players?.length);

let deleted = 0;
for (const p of players ?? []) {
  const { data: snaps } = await admin
    .from("ranking_snapshots")
    .select("id, season_id, scope, scope_key, updated_at")
    .eq("player_id", p.id)
    .order("updated_at", { ascending: false });
  if (!snaps) continue;
  const seen = new Set();
  const toDelete = [];
  for (const s of snaps) {
    const key = s.season_id + "|" + s.scope + "|" + s.scope_key;
    if (seen.has(key)) {
      toDelete.push(s.id);
    } else {
      seen.add(key);
    }
  }
  if (toDelete.length > 0) {
    const { error } = await admin
      .from("ranking_snapshots")
      .delete()
      .in("id", toDelete);
    if (error) console.log("  err:", p.id, error.message);
    else deleted += toDelete.length;
  }
}
console.log("Snapshots duplicados eliminados:", deleted);

const { data: sample } = await admin
  .from("ranking_snapshots")
  .select("id, season_id, scope, scope_key, player_id, goals, exclusions")
  .eq("player_id", "b998a15b-aa0b-4d37-af7d-bc32aef751a3");
for (const s of sample ?? []) {
  console.log("  -", s.scope, s.scope_key, "g=" + s.goals, "e=" + s.exclusions);
}

console.log("=== DONE ===");
process.exit(0);

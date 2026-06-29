import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

console.log("=== Simulando getRankingsMeta ===");

const { data: seasons } = await admin
  .from("seasons")
  .select("id, label, is_current")
  .order("label", { ascending: false });
console.log("Seasons:", seasons?.length);
const current = seasons?.find((s) => s.is_current) ?? seasons?.[0];
console.log("Current:", current?.label, current?.id);

if (!current) {
  console.log("No season");
  process.exit(0);
}

const { data: teams } = await admin
  .from("teams")
  .select("id, label, category_code, color, season_id")
  .eq("season_id", current.id);
console.log("Teams in season:", teams?.length);
for (const t of teams ?? []) console.log(" -", t.label, t.category_code);

const { data: rosters } = await admin
  .from("team_rosters")
  .select("team_id, left_at")
  .is("left_at", null);
const counts = new Map();
for (const r of rosters ?? []) counts.set(r.team_id, (counts.get(r.team_id) ?? 0) + 1);
console.log("Roster counts:", Object.fromEntries(counts));

const countsByCategory = new Map();
const teamList = (teams ?? []).map((t) => {
  const c = counts.get(t.id) ?? 0;
  countsByCategory.set(t.category_code, (countsByCategory.get(t.category_code) ?? 0) + c);
  return { id: t.id, label: t.label, category_code: t.category_code, color: t.color, player_count: c };
});
console.log("Categorias con count:");
for (const [c, n] of countsByCategory) console.log(" -", c, n);
console.log("Equipos devueltos:", teamList.length);
console.log("Categories que se renderizan en ScopeTabs:", countsByCategory.size);

console.log("=== DONE ===");
process.exit(0);

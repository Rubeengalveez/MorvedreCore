import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const ADMIN_EMAIL = "galvillo9@gmail.com";

function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(`No existe ${envPath}.`);
  }
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
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
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_FILE = resolve(ROOT, ".seed-batch.json");

// Cada tabla con un filtro que matchea TODAS las filas
// (PKs compuestas necesitan un filtro distinto a id)
const TABLES = [
  { table: "audit_log", filter: { op: "neq", col: "id", val: 0 } },
  {
    table: "access_request_children",
    filter: { op: "neq", col: "request_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "access_requests",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "travel_reservations",
    filter: { op: "neq", col: "offer_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "travel_offers",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "treasury_lines",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "treasury_period_closures",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "treasury_profile_concepts",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "treasury_concepts",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "shop_product_images",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "shop_order_items",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "shop_orders",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "shop_products",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "news_reactions",
    filter: { op: "neq", col: "post_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "news_posts",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "match_stats",
    filter: { op: "neq", col: "match_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "match_callups",
    filter: { op: "neq", col: "match_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "match_availability",
    filter: { op: "neq", col: "player_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "matches",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "training_attendance",
    filter: { op: "neq", col: "session_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "training_sessions",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "training_blocks",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "opponent_stats",
    filter: { op: "neq", col: "team_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "ranking_snapshots",
    filter: { op: "neq", col: "player_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "streaks",
    filter: { op: "neq", col: "subject_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "notifications",
    filter: { op: "neq", col: "recipient_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "push_subscriptions",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "historical_team_matchups",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "historical_player_stats",
    filter: { op: "neq", col: "profile_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "parent_child_links",
    filter: { op: "neq", col: "parent_profile_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "profile_notification_prefs",
    filter: { op: "neq", col: "profile_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "team_staff",
    filter: { op: "neq", col: "profile_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "team_rosters",
    filter: { op: "neq", col: "player_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "user_roles",
    filter: { op: "neq", col: "profile_id", val: "00000000-0000-0000-0000-000000000000" },
  },
  { table: "teams", filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" } },
  {
    table: "profiles",
    filter: { op: "neq", col: "id", val: "00000000-0000-0000-0000-000000000000" },
  },
];

async function empty() {
  console.log("[wipe] Vaciando tablas transaccionales...");
  for (const { table, filter } of TABLES) {
    let q = admin.from(table).delete();
    if (filter.op === "neq") q = q.neq(filter.col, filter.val);
    const { error } = await q;
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    } else {
      console.log(`  - ${table}: vaciada`);
    }
  }
}

async function deleteAuthUsers() {
  console.log("\n[wipe] Borrando auth users que no sean admin...");
  let deleted = 0;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw error;
    if (!data.users || data.users.length === 0) break;
    let deletedInPage = 0;
    for (const u of data.users) {
      if (u.email && u.email.toLowerCase() === ADMIN_EMAIL) continue;
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) throw delErr;
      deleted++;
      deletedInPage++;
    }
    if (deletedInPage === 0) break;
  }
  console.log(`  - ${deleted} auth users borrados (admin '${ADMIN_EMAIL}' conservado)`);
}

async function clearBatch() {
  mkdirSync(dirname(BATCH_FILE), { recursive: true });
  writeFileSync(BATCH_FILE, "{}");
  console.log("[wipe] .seed-batch.json reseteado");
}

async function main() {
  console.log("[wipe] Limpiando TODOS los datos del seed...\n");
  await empty();
  await deleteAuthUsers();
  await clearBatch();
  console.log(
    "\n[wipe] Listo. La base está limpia; se conservan solo el acceso admin y las temporadas.",
  );
  console.log("[wipe] Para repoblar: node scripts/seed/index.mjs all");
}

main().catch((err) => {
  console.error("[wipe] FATAL:", err);
  process.exit(1);
});

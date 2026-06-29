import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const RUBEN_ID = "b998a15b-aa0b-4d37-af7d-bc32aef751a3";
const SEASON_ID = "9e8945bd-fe73-40d8-8ac5-59e39f359843";

console.log("=== Creando equipos en temporada actual ===");

const TEAMS = [
  { label: "Benjamín", category: "benjamin", color: "#10B981", gender: "mixed" },
  { label: "Alevín", category: "alevin", color: "#F4C430", gender: "mixed" },
  { label: "Infantil", category: "infantil", color: "#FF6B35", gender: "mixed" },
  { label: "Cadete A", category: "cadete", color: "#1E5AA8", gender: "male" },
  { label: "Cadete B", category: "cadete", color: "#0F172A", gender: "male" },
  { label: "Juvenil", category: "juvenil", color: "#DC2626", gender: "male" },
  { label: "Absoluto", category: "absoluto", color: "#0F172A", gender: "male" },
  { label: "Escuela", category: "escuela", color: "#A78BFA", gender: "mixed" },
];

const teamIdsByLabel = {};

for (const t of TEAMS) {
  const { data: existing } = await admin
    .from("teams")
    .select("id")
    .eq("season_id", SEASON_ID)
    .eq("label", t.label)
    .maybeSingle();
  if (existing) {
    teamIdsByLabel[t.label] = existing.id;
    console.log("  ya existe:", t.label);
    continue;
  }
  const { data: created, error } = await admin
    .from("teams")
    .insert({
      season_id: SEASON_ID,
      label: t.label,
      category_code: t.category,
      gender: t.gender,
      color: t.color,
      home_pool: "Piscina Municipal de Sagunto",
      team_type: "competitive",
    })
    .select("id")
    .single();
  if (error) {
    console.log("  err:", t.label, error.message);
    continue;
  }
  teamIdsByLabel[t.label] = created.id;
  console.log("  creado:", t.label, created.id);
}

console.log("\n=== Asignando rosters de Rubén (3 equipos) ===");
const rosterLabels = ["Cadete B", "Juvenil", "Absoluto"];
const dorsales = { "Cadete B": 9, Juvenil: 7, Absoluto: 9 };
for (const label of rosterLabels) {
  const teamId = teamIdsByLabel[label];
  if (!teamId) continue;
  const { data: existing } = await admin
    .from("team_rosters")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", RUBEN_ID)
    .is("left_at", null)
    .maybeSingle();
  if (existing) {
    console.log("  ya en", label);
    continue;
  }
  const { error } = await admin.from("team_rosters").insert({
    team_id: teamId,
    player_id: RUBEN_ID,
    joined_at: "2026-09-01",
    squad_number: dorsales[label],
  });
  console.log("  roster", label, error?.message ?? "ok");
}

console.log("\n=== Asignando staff (head_coach de Cadete B y Juvenil) ===");
for (const label of ["Cadete B", "Juvenil"]) {
  const teamId = teamIdsByLabel[label];
  if (!teamId) continue;
  const { data: existing } = await admin
    .from("team_staff")
    .select("id")
    .eq("team_id", teamId)
    .eq("profile_id", RUBEN_ID)
    .eq("role", "head_coach")
    .maybeSingle();
  if (existing) {
    console.log("  ya staff", label);
    continue;
  }
  const { error } = await admin.from("team_staff").insert({
    team_id: teamId,
    profile_id: RUBEN_ID,
    role: "head_coach",
  });
  console.log("  staff", label, error?.message ?? "ok");
}

console.log("\n=== Creando algunos partidos con stats para Rubén ===");
const opponents = ["CE Mediterrani", "CN Sabadell", "CW Castellon", "CN Barcelona", "CN Valencia"];
for (const label of rosterLabels) {
  const teamId = teamIdsByLabel[label];
  if (!teamId) continue;
  for (let i = 0; i < 3; i++) {
    const daysAgo = 7 * (i + 1);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(18, 0, 0, 0);
    const opponent = opponents[i + 1] ?? opponents[0];
    const { data: match, error: mErr } = await admin
      .from("matches")
      .insert({
        season_id: SEASON_ID,
        team_id: teamId,
        opponent,
        competition_type: "league",
        is_home: i % 2 === 0,
        location: "Piscina Municipal de Sagunto",
        pool_name: "Piscina Municipal",
        scheduled_at: date.toISOString(),
        status: "played",
        final_score_us: 10 + i,
        final_score_them: 7 + i,
        mvp_player_id: null,
      })
      .select("id")
      .single();
    if (mErr) {
      console.log("  match err:", mErr.message);
      continue;
    }
    await admin
      .from("match_callups")
      .upsert(
        {
          match_id: match.id,
          player_id: RUBEN_ID,
          cap_number: 9,
          status: "confirmed",
          source_team_id: teamId,
        },
        { onConflict: "match_id,player_id" },
      );
    const goals = [3, 2, 1][i] ?? 0;
    await admin
      .from("match_stats")
      .upsert(
        {
          match_id: match.id,
          player_id: RUBEN_ID,
          goals,
          exclusions: 0,
          mvp: i === 0,
        },
        { onConflict: "match_id,player_id" },
      );
    console.log("  partido", label, "vs", opponent, "(", goals, "goles )");
  }
}

console.log("\n=== DONE ===");
process.exit(0);

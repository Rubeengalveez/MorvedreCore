import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FIRST_NAMES = [
  "Hugo", "Mateo", "Martín", "Lucas", "Leo", "Daniel", "Alejandro", "Pablo",
  "Manuel", "Álvaro", "Adrián", "David", "Mario", "Bruno", "Izan", "Oliver",
  "Héctor", "Thiago", "Mateo", "Liam", "Marco", "Marc", "Nacho", "Leo", "Joel",
  "Arnau", "Eric", "Pol", "Rayan", "Hugo", "Pau", "Saúl", "Iván", "Eric",
  "Carmen", "Lucía", "Sofía", "Martina", "María", "Julia", "Paula", "Daniela",
  "Valeria", "Alba", "Emma", "Carla", "Sara", "Noa", "Laura", "Andrea",
];
const LAST_NAMES = [
  "García", "Rodríguez", "Martínez", "López", "Sánchez", "Pérez", "Gómez",
  "Fernández", "Ruiz", "Hernández", "Jiménez", "Díaz", "Moreno", "Muñoz",
  "Romero", "Alonso", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos",
  "Gil", "Molina", "Serrano", "Blanco", "Pascual", "Gallego", "Vidal",
  "Bravo", "Carmona", "Ferrer", "León", "Marín", "Soler", "Varela", "Crespo",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function fullName(i) {
  return `${pick(FIRST_NAMES, i * 7 + 3)} ${pick(LAST_NAMES, i * 11 + 5)} ${pick(LAST_NAMES, i * 13 + 7)}`;
}

const CURRENT_YEAR = 2026;
const PHASE = "morvedre-seed-2026";
const seasonLabel = "2026/2027";

async function wipe() {
  console.log(`[seed:${PHASE}] Wiping previous seed data...`);
  await admin.from("match_callups").delete().like("match_id", `${PHASE}-%`);
  await admin.from("match_stats").delete().like("match_id", `${PHASE}-%`);
  await admin
    .from("match_availability")
    .delete()
    .gte("date", "2026-01-01")
    .like("player_id", `${PHASE}-%`);
  await admin.from("training_attendance").delete().like("session_id", `${PHASE}-%`);
  await admin
    .from("training_sessions")
    .delete()
    .like("id", `${PHASE}-%`);
  await admin
    .from("training_blocks")
    .delete()
    .like("id", `${PHASE}-%`);
  await admin.from("matches").delete().like("id", `${PHASE}-%`);
  await admin.from("team_rosters").delete().like("player_id", `${PHASE}-%`);
  await admin.from("team_staff").delete().like("profile_id", `${PHASE}-%`);
  await admin.from("user_roles").delete().like("profile_id", `${PHASE}-%`);
  await admin.from("profiles").delete().like("id", `${PHASE}-%`);
}

async function ensureSeason() {
  const { data: existing } = await admin
    .from("seasons")
    .select("id, label, is_current")
    .eq("label", seasonLabel)
    .maybeSingle();
  if (existing) {
    if (!existing.is_current) {
      await admin.from("seasons").update({ is_current: false }).neq("id", existing.id);
      await admin.from("seasons").update({ is_current: true }).eq("id", existing.id);
    }
    return existing.id;
  }
  const { data, error } = await admin
    .from("seasons")
    .insert({
      label: seasonLabel,
      start_date: "2026-09-01",
      end_date: "2027-07-31",
      is_current: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

const TEAMS = [
  { code: "benjamin", label: "Benjamín", gender: "mixed", count: 6 },
  { code: "alevin", label: "Alevín", gender: "mixed", count: 7 },
  { code: "infantil", label: "Infantil", gender: "mixed", count: 7 },
  { code: "cadete", label: "Cadete A", gender: "male", count: 8 },
  { code: "cadete", label: "Cadete B", gender: "male", count: 7 },
  { code: "juvenil", label: "Juvenil", gender: "male", count: 7 },
  { code: "absoluto", label: "Absoluto", gender: "male", count: 8 },
  { code: "escuela", label: "Escuela", gender: "mixed", team_type: "school", count: 3 },
];

const CATEGORY_COLOR = {
  benjamin: "#10B981",
  alevin: "#F4C430",
  infantil: "#FF6B35",
  cadete: "#1E5AA8",
  juvenil: "#DC2626",
  absoluto: "#0F172A",
  escuela: "#A78BFA",
};

const COACHES = [
  { name: "Vega Martínez", label: "Benjamín" },
  { name: "Vitaliy Petrov", label: "Alevín, Infantil, Cadete A, Absoluto" },
  { name: "Rubén Gálvez", label: "Cadete B, Juvenil" },
];

async function createCoachProfiles() {
  const out = [];
  for (let i = 0; i < COACHES.length; i++) {
    const c = COACHES[i];
    const id = `${PHASE}-coach-${i}`;
    await admin
      .from("profiles")
      .upsert(
        {
          id,
          full_name: c.name,
          birth_year: CURRENT_YEAR - 35,
          gender: "male",
          cap_number: null,
          license_active: true,
          must_change_password: false,
        },
        { onConflict: "id" },
      );
    out.push({ id, name: c.name, teamLabels: c.label.split(",").map((s) => s.trim()) });
  }
  return out;
}

async function createAdminProfile() {
  const id = `${PHASE}-admin`;
  await admin
    .from("profiles")
    .upsert(
      {
        id,
        full_name: "Rubén Gálvez",
        birth_year: CURRENT_YEAR - 35,
        gender: "male",
        cap_number: 7,
        license_active: true,
        must_change_password: false,
      },
      { onConflict: "id" },
    );
  return id;
}

async function assignRoles(adminId, coaches) {
  await admin
    .from("user_roles")
    .upsert(
      { profile_id: adminId, role: "admin", scope_team_id: null, granted_by: null },
      { onConflict: "profile_id,role,scope_team_id" },
    );
  for (const c of coaches) {
    await admin
      .from("user_roles")
      .upsert(
        { profile_id: c.id, role: "coach", scope_team_id: null, granted_by: adminId },
        { onConflict: "profile_id,role,scope_team_id" },
      );
  }
}

async function createPlayers(count, baseYear) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const id = `${PHASE}-player-${i}`;
    const fullNameStr = fullName(i);
    const birthYear = baseYear - (i % 3);
    await admin
      .from("profiles")
      .upsert(
        {
          id,
          full_name: fullNameStr,
          birth_year: birthYear,
          gender: i % 4 === 3 ? "female" : "male",
          cap_number: (i % 15) + 1,
          license_active: i % 5 !== 0,
          must_change_password: false,
        },
        { onConflict: "id" },
      );
    await admin
      .from("user_roles")
      .upsert(
        { profile_id: id, role: "player", scope_team_id: null, granted_by: null },
        { onConflict: "profile_id,role,scope_team_id" },
      );
    out.push(id);
  }
  return out;
}

async function createTeams(seasonId) {
  const teamIdByLabel = new Map();
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const id = `${PHASE}-team-${i}`;
    const teamType = "team_type" in t ? t.team_type : "competitive";
    const color = CATEGORY_COLOR[t.code] ?? "#0A2E5C";
    await admin
      .from("teams")
      .upsert(
        {
          id,
          season_id: seasonId,
          category_code: t.code,
          label: t.label,
          gender: t.gender,
          team_type: teamType,
          color,
        },
        { onConflict: "id" },
      );
    teamIdByLabel.set(t.label, id);
  }
  return teamIdByLabel;
}

async function assignStaff(teamIdByLabel, coaches) {
  for (const c of coaches) {
    for (const label of c.teamLabels) {
      const teamId = teamIdByLabel.get(label);
      if (!teamId) continue;
      await admin
        .from("team_staff")
        .upsert(
          { team_id: teamId, profile_id: c.id, role: "head_coach", granted_by: null },
          { onConflict: "team_id,profile_id,role" },
        );
    }
  }
}

async function assignRosters(teamIdByLabel, players) {
  let i = 0;
  for (const t of TEAMS) {
    const teamId = teamIdByLabel.get(t.label);
    if (!teamId) continue;
    for (let j = 0; j < t.count && i < players.length; j++, i++) {
      const playerId = players[i];
      await admin
        .from("team_rosters")
        .upsert(
          {
            team_id: teamId,
            player_id: playerId,
            squad_number: (i % 15) + 1,
            joined_at: "2026-09-01",
          },
          { onConflict: "team_id,player_id" },
        );
    }
  }
}

async function createTrainingBlocksAndSessions(teamIdByLabel, adminId) {
  void adminId;
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const teamId = teamIdByLabel.get(t.label);
    if (!teamId) continue;
    const blockId = `${PHASE}-block-${i}`;
    const weekdays = t.code === "benjamin" ? [1, 3, 5] : [1, 3, 5];
    await admin
      .from("training_blocks")
      .upsert(
        {
          id: blockId,
          team_id: teamId,
          label: `Pretemporada ${t.label}`,
          weekdays,
          start_date: "2026-09-01",
          end_date: "2027-06-30",
          start_time: t.code === "benjamin" || t.code === "alevin" ? "17:30" : "19:00",
          end_time: t.code === "benjamin" || t.code === "alevin" ? "19:00" : "20:30",
          kind: "water",
          is_active: true,
          created_by: adminId,
        },
        { onConflict: "id" },
      );

    const sessionsToCreate = [];
    const startDate = new Date("2026-09-01T00:00:00Z");
    const endDate = new Date("2026-12-31T00:00:00Z");
    const sessionStartHour = t.code === "benjamin" || t.code === "alevin" ? 17 : 19;
    const sessionDuration = 90;
    for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      const monFirst = dow === 0 ? 7 : dow;
      if (!weekdays.includes(monFirst)) continue;
      const isoDay = d.toISOString().slice(0, 10);
      const isoDateTime = `${isoDay}T${String(sessionStartHour).padStart(2, "0")}:00:00Z`;
      sessionsToCreate.push({
        id: `${PHASE}-session-${i}-${isoDay}`,
        block_id: blockId,
        team_id: teamId,
        scheduled_at: isoDateTime,
        duration_minutes: sessionDuration,
      });
    }
    if (sessionsToCreate.length > 0) {
      const { error } = await admin
        .from("training_sessions")
        .upsert(sessionsToCreate, { onConflict: "id" });
      if (error) {
        console.error(`[seed] training_sessions insert failed for team ${t.label}:`, error.message);
      }
    }
  }
}

async function createMatches(teamIdByLabel, adminId) {
  void adminId;
  const competitors = [
    "CN Elche",
    "CN Valencia",
    "CN Godella",
    "CN Petrer",
    "CN Caragoles",
    "CE Mediterrani",
    "CW Castellon",
    "Askartza",
  ];
  const competitiveTeams = TEAMS.filter((t) => t.code !== "escuela");
  for (let i = 0; i < competitiveTeams.length; i++) {
    const t = competitiveTeams[i];
    const teamId = teamIdByLabel.get(t.label);
    if (!teamId) continue;
    const teamRow = await admin.from("teams").select("season_id").eq("id", teamId).single();
    const seasonId = teamRow.data.season_id;
    for (let j = 0; j < 4; j++) {
      const opponent = competitors[(i + j) % competitors.length];
      const isHome = (i + j) % 2 === 0;
      const matchDate = new Date("2026-10-15T00:00:00Z");
      matchDate.setUTCDate(matchDate.getUTCDate() + i * 7 + j * 14);
      const hour = 10 + (i % 3) * 2;
      const id = `${PHASE}-match-${i}-${j}`;
      const competitionType =
        j === 0 ? "league" : j === 1 ? "cup" : j === 2 ? "tournament" : "friendly";
      await admin
        .from("matches")
        .upsert(
          {
            id,
            season_id: seasonId,
            team_id: teamId,
            opponent,
            competition_type: competitionType,
            is_home: isHome,
            location: "Piscina Municipal",
            pool_name: "Piscina 25m",
            scheduled_at: `${matchDate.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00:00Z`,
            status: "scheduled",
          },
          { onConflict: "id" },
        );
    }
  }
}

async function main() {
  console.log(`[seed:${PHASE}] Starting seed...`);

  await wipe();

  const seasonId = await ensureSeason();
  console.log(`[seed] season: ${seasonId}`);

  const adminId = await createAdminProfile();
  console.log(`[seed] admin: ${adminId}`);

  const coaches = await createCoachProfiles();
  console.log(`[seed] coaches: ${coaches.length}`);

  await assignRoles(adminId, coaches);

  const totalPlayers = TEAMS.reduce((acc, t) => acc + t.count, 0);
  const players = await createPlayers(totalPlayers, CURRENT_YEAR - 12);
  console.log(`[seed] players: ${players.length}`);

  const teamIdByLabel = await createTeams(seasonId);
  console.log(`[seed] teams: ${TEAMS.length}`);

  await assignStaff(teamIdByLabel, coaches);
  await assignRosters(teamIdByLabel, players);
  await createTrainingBlocksAndSessions(teamIdByLabel, adminId);
  await createMatches(teamIdByLabel, adminId);

  const competitiveTeamsCount = TEAMS.filter((t) => t.code !== "escuela").length;

  console.log(`[seed] Done!`);
  console.log(`  Players: ${players.length} profiles created`);
  console.log(`  Teams: ${TEAMS.length} teams in season ${seasonLabel}`);
  console.log(`  Training blocks: ${TEAMS.length} blocks with sessions through Dec 2026`);
  console.log(`  Matches: ~${competitiveTeamsCount * 4} matches across 4 competitions`);
  console.log("");
  console.log(`To clean up: re-run this script (it wipes data with the '${PHASE}-' prefix)`);
}

main().catch((err) => {
  console.error("[seed] FATAL:", err);
  process.exit(1);
});

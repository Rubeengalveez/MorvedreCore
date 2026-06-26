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

const PHASE = "morvedre-seed-2026";
const CURRENT_YEAR = 2026;
const seasonLabel = "2026/2027";

const FIRST_NAMES_M = [
  "Hugo", "Mateo", "Martín", "Lucas", "Leo", "Daniel", "Alejandro", "Pablo",
  "Manuel", "Álvaro", "Adrián", "David", "Mario", "Bruno", "Izan", "Oliver",
  "Héctor", "Thiago", "Liam", "Marco", "Marc", "Nacho", "Joel",
  "Arnau", "Eric", "Pol", "Rayan", "Pau", "Saúl", "Iván", "Mateo",
];
const FIRST_NAMES_F = [
  "Carmen", "Lucía", "Sofía", "Martina", "María", "Julia", "Paula", "Daniela",
  "Valeria", "Alba", "Emma", "Carla", "Sara", "Noa", "Laura", "Andrea",
  "Carmen", "Lucía", "Sofía", "Martina", "Julia", "Paula", "Marta", "Claudia",
];
const LAST_NAMES = [
  "García", "Rodríguez", "Martínez", "López", "Sánchez", "Pérez", "Gómez",
  "Fernández", "Ruiz", "Hernández", "Jiménez", "Díaz", "Moreno", "Muñoz",
  "Romero", "Alonso", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos",
  "Gil", "Molina", "Serrano", "Blanco", "Pascual", "Gallego", "Vidal",
  "Bravo", "Carmona", "Ferrer", "León", "Marín", "Soler", "Varela", "Crespo",
  "Aguilar", "Caballero", "Carrasco", "Cuesta", "Domínguez", "Espinoza",
];

const OPPONENTS = [
  "CN Elche", "CN Valencia", "CN Godella", "CN Petrer", "CE Mediterrani",
  "CW Castellon", "Askartza LE", "CN Sabadell Sur", "CN Terrassa",
  "CN Barcelona", "CN Sant Andreu", "CN Vallirana",
];

const COMPETITION_TYPES = ["league", "cup", "tournament", "friendly"];

function pick(arr, i) {
  return arr[i % arr.length];
}

function fullName(i, gender) {
  const first = gender === "female"
    ? pick(FIRST_NAMES_F, i * 7 + 3)
    : pick(FIRST_NAMES_M, i * 7 + 3);
  return `${first} ${pick(LAST_NAMES, i * 11 + 5)} ${pick(LAST_NAMES, i * 13 + 7)}`;
}

function categoryForBirthYear(birthYear) {
  const age = CURRENT_YEAR - birthYear;
  if (age <= 10) return { code: "benjamin", minAge: 10, maxAge: 11 };
  if (age <= 12) return { code: "alevin", minAge: 12, maxAge: 13 };
  if (age <= 14) return { code: "infantil", minAge: 14, maxAge: 15 };
  if (age <= 16) return { code: "cadete", minAge: 16, maxAge: 17 };
  if (age <= 18) return { code: "juvenil", minAge: 18, maxAge: 19 };
  return { code: "absoluto", minAge: 20, maxAge: 30 };
}

const TEAMS = [
  { code: "benjamin", label: "Benjamín", gender: "mixed", count: 7, weekday: 1, hour: 17, capMin: 1, capMax: 12 },
  { code: "alevin", label: "Alevín", gender: "mixed", count: 9, weekday: 3, hour: 17, capMin: 1, capMax: 14 },
  { code: "infantil", label: "Infantil", gender: "mixed", count: 11, weekday: 1, hour: 18, capMin: 1, capMax: 14 },
  { code: "cadete", label: "Cadete A", gender: "male", count: 14, weekday: 3, hour: 19, capMin: 1, capMax: 15 },
  { code: "cadete", label: "Cadete B", gender: "male", count: 12, weekday: 5, hour: 19, capMin: 1, capMax: 15 },
  { code: "juvenil", label: "Juvenil", gender: "male", count: 13, weekday: 1, hour: 20, capMin: 1, capMax: 15 },
  { code: "absoluto", label: "Absoluto", gender: "male", count: 15, weekday: 3, hour: 20, capMin: 1, capMax: 15 },
  { code: "escuela", label: "Escuela", gender: "mixed", team_type: "school", count: 6, weekday: 2, hour: 17, capMin: 1, capMax: 12 },
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
  { name: "Vega Martínez", teamLabels: ["Benjamín"] },
  { name: "Vitaliy Petrov", teamLabels: ["Alevín", "Infantil", "Cadete A", "Absoluto"] },
  { name: "Rubén Gálvez", teamLabels: ["Cadete B", "Juvenil"] },
];

const DIRECTIVA = [
  { name: "Eva Sánchez", role: "directiva" },
  { name: "Mónica Gil", role: "directiva" },
  { name: "Sol Romero", role: "directiva" },
  { name: "Pedro Martínez", role: "directiva" },
];

const DELEGATES = [
  { name: "Antonio López", teamLabel: "Benjamín" },
  { name: "Carmen Fernández", teamLabel: "Alevín" },
  { name: "José Pérez", teamLabel: "Infantil" },
  { name: "Manuel García", teamLabel: "Cadete A" },
  { name: "Francisco Vidal", teamLabel: "Cadete B" },
  { name: "Juan Bravo", teamLabel: "Juvenil" },
  { name: "Miguel Ángel Soler", teamLabel: "Absoluto" },
];

function randomDateBetween(start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return new Date(startMs + Math.random() * (endMs - startMs));
}

function isoDay(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isoDateTime(d) {
  return `${d.toISOString().slice(0, 19)}Z`;
}

async function wipe() {
  console.log(`[seed] Wiping ${PHASE}-* data...`);
  await admin.from("match_stats").delete().like("match_id", `${PHASE}-%`);
  await admin.from("match_callups").delete().like("match_id", `${PHASE}-%`);
  await admin
    .from("match_availability")
    .delete()
    .like("player_id", `${PHASE}-%`);
  await admin.from("training_attendance").delete().like("session_id", `${PHASE}-%`);
  await admin.from("training_sessions").delete().like("id", `${PHASE}-%`);
  await admin.from("training_blocks").delete().like("id", `${PHASE}-%`);
  await admin.from("matches").delete().like("id", `${PHASE}-%`);
  await admin.from("team_rosters").delete().like("player_id", `${PHASE}-%`);
  await admin.from("team_staff").delete().like("profile_id", `${PHASE}-%`);
  await admin.from("user_roles").delete().like("profile_id", `${PHASE}-%`);
  await admin.from("profiles").delete().like("id", `${PHASE}-%`);
}

async function ensureSeason() {
  const { data: existing } = await admin
    .from("seasons")
    .select("id, is_current")
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

async function createProfileAndAuth(profile) {
  const email = `${profile.id}@morvedre-test.app`;
  const password = "Morvedre2026!";
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  let authUserId;
  if (found) {
    authUserId = found.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    authUserId = data.user.id;
  }
  await admin
    .from("profiles")
    .upsert(
      {
        id: profile.id,
        auth_user_id: authUserId,
        full_name: profile.full_name,
        birth_year: profile.birth_year,
        gender: profile.gender,
        cap_number: profile.cap_number ?? null,
        license_active: profile.license_active ?? true,
        must_change_password: false,
        team_color: profile.team_color ?? null,
      },
      { onConflict: "id" },
    );
  return authUserId;
}

async function assignRole(profileId, role, scopeTeamId = null) {
  await admin
    .from("user_roles")
    .upsert(
      { profile_id: profileId, role, scope_team_id: scopeTeamId, granted_by: null },
      { onConflict: "profile_id,role,scope_team_id" },
    );
}

async function createUser(definition) {
  const id = `${PHASE}-${definition.id}`;
  const authUserId = await createProfileAndAuth({ id, ...definition.profile });
  for (const role of definition.roles) {
    await assignRole(id, role);
  }
  return { id, authUserId };
}

async function createTeamsAndRosters() {
  const teamIdByLabel = new Map();
  const playersByTeam = new Map();
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const teamId = `${PHASE}-team-${i}`;
    const teamType = "team_type" in t ? t.team_type : "competitive";
    await admin
      .from("teams")
      .upsert(
        {
          id: teamId,
          season_id: (await admin.from("seasons").select("id").eq("is_current", true).single()).data.id,
          category_code: t.code,
          label: t.label,
          gender: t.gender,
          team_type: teamType,
          color: CATEGORY_COLOR[t.code],
        },
        { onConflict: "id" },
      );
    teamIdByLabel.set(t.label, teamId);
    playersByTeam.set(t.label, []);

    for (let p = 0; p < t.count; p++) {
      const playerId = `${PHASE}-player-${i}-${p}`;
      const isFemale = Math.random() < 0.15;
      const birthYear = CURRENT_YEAR - (t === TEAMS[0] || t === TEAMS[7] ? 11 : t === TEAMS[1] ? 12 : t === TEAMS[2] ? 14 : t === TEAMS[3] || t === TEAMS[4] ? 16 : t === TEAMS[5] ? 18 : 22) - (p % 3);
      const profile = {
        full_name: fullName(i * 100 + p, isFemale ? "female" : "male"),
        birth_year,
        gender: isFemale ? "female" : "male",
        cap_number: t.capMin === t.capMax ? t.capMin : t.capMin + (p % (t.capMax - t.capMin + 1)),
        license_active: Math.random() > 0.05,
        team_color: CATEGORY_COLOR[t.code],
      };
      await createProfileAndAuth({ id: playerId, ...profile });
      await assignRole(playerId, "player");
      await admin
        .from("team_rosters")
        .upsert(
          {
            team_id: teamId,
            player_id: playerId,
            squad_number: profile.cap_number,
            joined_at: "2026-09-01",
          },
          { onConflict: "team_id,player_id" },
        );
      playersByTeam.get(t.label).push({ id: playerId, profile });
    }
  }
  return { teamIdByLabel, playersByTeam };
}

async function createStaffAndDelegates(teamIdByLabel) {
  for (const c of COACHES) {
    const coachId = `${PHASE}-coach-${c.name.split(" ")[0].toLowerCase()}`;
    await createProfileAndAuth({
      id: coachId,
      full_name: c.name,
      birth_year: CURRENT_YEAR - 38,
      gender: "male",
      license_active: true,
      must_change_password: false,
    });
    await assignRole(coachId, "coach");
    for (const label of c.teamLabels) {
      const teamId = teamIdByLabel.get(label);
      if (teamId) {
        await admin
          .from("team_staff")
          .upsert(
            { team_id: teamId, profile_id: coachId, role: "head_coach", granted_by: null },
            { onConflict: "team_id,profile_id,role" },
          );
      }
    }
  }

  for (const d of DIRECTIVA) {
    const id = `${PHASE}-dir-${d.name.split(" ")[0].toLowerCase()}`;
    await createProfileAndAuth({
      id,
      full_name: d.name,
      birth_year: CURRENT_YEAR - 45,
      gender: "female",
      license_active: false,
      must_change_password: false,
    });
    await assignRole(id, "directiva");
  }

  for (const d of DELEGATES) {
    const id = `${PHASE}-del-${d.name.split(" ")[0].toLowerCase()}-${d.teamLabel.toLowerCase().replace(/\s/g, "")}`;
    const teamId = teamIdByLabel.get(d.teamLabel);
    await createProfileAndAuth({
      id,
      full_name: d.name,
      birth_year: CURRENT_YEAR - 40,
      gender: "male",
      license_active: true,
      must_change_password: false,
    });
    await assignRole(id, "delegate", teamId);
    if (teamId) {
      await admin
        .from("team_staff")
        .upsert(
          { team_id: teamId, profile_id: id, role: "delegate", granted_by: null },
          { onConflict: "team_id,profile_id,role" },
        );
    }
  }
}

async function createTraining(playersByTeam) {
  const now = new Date();
  const startDate = new Date("2026-09-01T00:00:00Z");
  const endDate = new Date("2027-06-30T00:00:00Z");

  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const blockId = `${PHASE}-block-${i}`;
    await admin
      .from("training_blocks")
      .upsert(
        {
          id: blockId,
          team_id: `${PHASE}-team-${i}`,
          label: `Temporada ${t.label} ${CURRENT_YEAR}/2027`,
          weekdays: [t.weekday, t.weekday === 5 ? 1 : t.weekday + 2],
          start_date: "2026-09-01",
          end_date: "2027-06-30",
          start_time: `${String(t.hour).padStart(2, "0")}:00`,
          end_time: `${String(t.hour + 1).padStart(2, "0")}:30`,
          kind: t.code === "escuela" ? "mixed" : "water",
          is_active: true,
          created_by: null,
        },
        { onConflict: "id" },
      );

    const sessions = [];
    const attendanceInserts = [];
    for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      const monFirst = dow === 0 ? 7 : dow;
      if (monFirst !== t.weekday && monFirst !== (t.weekday === 5 ? 1 : t.weekday + 2)) continue;
      const isoDayStr = isoDay(d);
      const id = `${PHASE}-sess-${i}-${isoDayStr}`;
      const isPast = d < now;
      sessions.push({
        id,
        block_id: blockId,
        team_id: `${PHASE}-team-${i}`,
        scheduled_at: `${isoDayStr}T${String(t.hour).padStart(2, "0")}:00:00Z`,
        duration_minutes: 90,
        location: "Piscina Municipal",
      });
      if (isPast && Math.random() < 0.7) {
        const teamPlayers = playersByTeam.get(t.label) ?? [];
        for (const player of teamPlayers) {
          attendanceInserts.push({
            session_id: id,
            player_id: player.id,
            present: Math.random() > 0.15,
            marked_by: null,
            marked_at: d.toISOString(),
          });
        }
      }
    }
    if (sessions.length > 0) {
      const { error } = await admin
        .from("training_sessions")
        .upsert(sessions, { onConflict: "id" });
      if (error) console.error(`[seed] training_sessions error for ${t.label}:`, error.message);
    }
    if (attendanceInserts.length > 0) {
      const { error } = await admin
        .from("training_attendance")
        .upsert(attendanceInserts, { onConflict: "session_id,player_id" });
      if (error) console.error(`[seed] training_attendance error for ${t.label}:`, error.message);
    }
  }
}

async function createMatchesAndStats(teamIdByLabel, playersByTeam) {
  const now = new Date();
  const seasonStart = new Date("2026-09-15T00:00:00Z");
  const seasonEnd = new Date("2027-06-15T00:00:00Z");

  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    if (t.code === "escuela") continue;
    const teamId = `${PHASE}-team-${i}`;
    const teamPlayers = playersByTeam.get(t.label) ?? [];
    if (teamPlayers.length < 5) continue;

    for (let j = 0; j < 6; j++) {
      const matchDate = randomDateBetween(seasonStart, seasonEnd);
      const isPast = matchDate < now;
      const isHome = (i + j) % 2 === 0;
      const competition = COMPETITION_TYPES[j % COMPETITION_TYPES.length];
      const id = `${PHASE}-match-${i}-${j}`;
      const hour = 10 + (i % 3) * 3;
      const matchDateTime = new Date(matchDate);
      matchDateTime.setUTCHours(hour, 0, 0, 0);

      await admin
        .from("matches")
        .upsert(
          {
            id,
            season_id: (await admin.from("seasons").select("id").eq("is_current", true).single()).data.id,
            team_id: teamId,
            opponent: pick(OPPONENTS, i * 7 + j * 13),
            competition_type: competition,
            is_home: isHome,
            location: isHome ? "Piscina Municipal Puerto Sagunto" : "Piscina visitante",
            pool_name: "Piscina 25m",
            scheduled_at: isoDateTime(matchDateTime),
            status: isPast ? "played" : "scheduled",
            final_score_us: isPast ? Math.floor(Math.random() * 15) + 5 : null,
            final_score_them: isPast ? Math.floor(Math.random() * 13) + 3 : null,
          },
          { onConflict: "id" },
        );

      const numCallups = Math.min(13, teamPlayers.length);
      const selectedPlayers = [...teamPlayers]
        .sort(() => Math.random() - 0.5)
        .slice(0, numCallups);
      const callupInserts = selectedPlayers.map((p, idx) => ({
        match_id: id,
        player_id: p.id,
        cap_number: idx + 1,
        status: isPast ? (Math.random() > 0.05 ? "confirmed" : "declined") : "called",
        confirmed_at: isPast ? matchDateTime.toISOString() : null,
        source_team_id: null,
      }));
      await admin.from("match_callups").upsert(callupInserts, { onConflict: "match_id,player_id" });

      if (isPast) {
        const statInserts = selectedPlayers.map((p) => {
          const goals = Math.random() < 0.3 ? Math.floor(Math.random() * 4) : 0;
          const exclusions = Math.random() < 0.4 ? Math.floor(Math.random() * 3) : 0;
          const mvp = Math.random() < 0.1;
          return {
            match_id: id,
            player_id: p.id,
            goals,
            exclusions,
            mvp,
            entered_by: null,
            entered_at: matchDateTime.toISOString(),
            validated_by: null,
            validated_at: null,
          };
        });
        await admin.from("match_stats").upsert(statInserts, { onConflict: "match_id,player_id" });
      }
    }
  }
}

async function createAvailability(playersByTeam) {
  const today = new Date();
  const inserts = [];
  for (const [, players] of playersByTeam) {
    for (const p of players) {
      if (Math.random() < 0.2) {
        const daysAhead = Math.floor(Math.random() * 30) + 1;
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() + daysAhead);
        const reasons = ["Médico", "Viaje familiar", "Examen", "Boda", "Compromiso laboral"];
        inserts.push({
          player_id: p.id,
          date: isoDay(date),
          available: false,
          reason: pick(reasons, Math.random() * 10),
        });
      }
    }
  }
  if (inserts.length > 0) {
    const { error } = await admin
      .from("match_availability")
      .upsert(inserts, { onConflict: "player_id,date" });
    if (error) console.error("[seed] match_availability error:", error.message);
  }
}

async function main() {
  console.log(`[seed] Starting comprehensive seed (${PHASE})...`);
  console.log(`[seed] WARNING: This will create ~100+ users in Supabase Auth.`);
  console.log(`[seed] Press Ctrl+C in next 3 seconds to cancel...`);
  await new Promise((r) => setTimeout(r, 3000));

  await wipe();
  await ensureSeason();

  const { teamIdByLabel, playersByTeam } = await createTeamsAndRosters();
  console.log(`[seed] Teams + rosters created`);

  await createStaffAndDelegates(teamIdByLabel);
  console.log(`[seed] Staff + delegates created`);

  await createTraining(playersByTeam);
  console.log(`[seed] Training blocks + sessions + attendance created`);

  await createMatchesAndStats(teamIdByLabel, playersByTeam);
  console.log(`[seed] Matches + callups + stats created`);

  await createAvailability(playersByTeam);
  console.log(`[seed] Availability records created`);

  const totalPlayers = Array.from(playersByTeam.values()).reduce((acc, p) => acc + p.length, 0);

  console.log("");
  console.log("[seed] Done!");
  console.log(`  Total profiles: ${totalPlayers + COACHES.length + DIRECTIVA.length + DELEGATES.length}`);
  console.log(`  Players: ${totalPlayers}`);
  console.log(`  Coaches: ${COACHES.length}`);
  console.log(`  Directiva: ${DIRECTIVA.length}`);
  console.log(`  Delegates: ${DELEGATES.length}`);
  console.log("");
  console.log(`  All auth users have password: Morvedre2026!`);
  console.log(`  All data prefixed with: ${PHASE}-`);
  console.log("");
  console.log("To login as a test user:");
  console.log("  Email: morvedre-seed-2026-player-0-0@morvedre-test.app");
  console.log("  Password: Morvedre2026!");
  console.log("");
  console.log("To clean up: re-run this script (it wipes data with the prefix)");
}

main().catch((err) => {
  console.error("[seed] FATAL:", err);
  process.exit(1);
});

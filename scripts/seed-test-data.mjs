import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

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

const FIRST_NAMES_M = ["Hugo", "Mateo", "Martín", "Lucas", "Leo", "Daniel", "Alejandro", "Pablo", "Manuel", "Álvaro", "Adrián", "David", "Mario", "Bruno", "Izan", "Oliver", "Héctor", "Thiago", "Liam", "Marco", "Marc", "Nacho", "Joel", "Arnau", "Eric", "Pol", "Rayan", "Pau", "Saúl", "Iván"];
const FIRST_NAMES_F = ["Carmen", "Lucía", "Sofía", "Martina", "María", "Julia", "Paula", "Daniela", "Valeria", "Alba", "Emma", "Carla", "Sara", "Noa", "Laura", "Andrea", "Marta", "Claudia", "Elena", "Sara"];
const LAST_NAMES = ["García", "Rodríguez", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández", "Ruiz", "Hernández", "Jiménez", "Díaz", "Moreno", "Muñoz", "Romero", "Alonso", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Molina", "Serrano", "Blanco", "Pascual", "Gallego", "Vidal", "Bravo", "Carmona"];
const OPPONENTS = ["CN Elche", "CN Valencia", "CN Godella", "CN Petrer", "CE Mediterrani", "CW Castellon", "Askartza LE", "CN Sabadell Sur", "CN Terrassa", "CN Barcelona"];

const CURRENT_YEAR = 2026;
const seasonLabel = "2025/2026"; // Cambiado a la temporada actual para que la mitad de los partidos queden en el pasado
const BATCH_FILE = resolve(process.cwd(), ".seed-batch.json");

function pick(arr, i) {
  return arr[i % arr.length];
}

function fullName(i, gender) {
  const first = gender === "female" ? pick(FIRST_NAMES_F, i * 7 + 3) : pick(FIRST_NAMES_M, i * 7 + 3);
  return `${first} ${pick(LAST_NAMES, i * 11 + 5)} ${pick(LAST_NAMES, i * 13 + 7)}`;
}

function isoDateTime(d) {
  return `${d.toISOString().slice(0, 19)}Z`;
}

function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function randomDateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function loadBatch() {
  if (!existsSync(BATCH_FILE)) return null;
  try {
    return JSON.parse(readFileSync(BATCH_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveBatch(data) {
  writeFileSync(BATCH_FILE, JSON.stringify(data, null, 2));
}

async function wipe() {
  const prev = loadBatch();
  if (!prev) return;
  console.log(`[seed] Wiping previous batch (${prev.profileIds?.length ?? 0} profiles)...`);
  const { profileIds = [], teamIds = [], trainingBlockIds = [], trainingSessionIds = [], matchIds = [] } = prev;
  if (matchIds.length > 0) {
    await admin.from("match_stats").delete().in("match_id", matchIds);
    await admin.from("match_callups").delete().in("match_id", matchIds);
    await admin.from("matches").delete().in("id", matchIds);
  }
  if (trainingSessionIds.length > 0) {
    await admin.from("training_attendance").delete().in("session_id", trainingSessionIds);
    await admin.from("training_sessions").delete().in("id", trainingSessionIds);
  }
  if (trainingBlockIds.length > 0) {
    await admin.from("training_blocks").delete().in("id", trainingBlockIds);
  }
  if (profileIds.length > 0) {
    await admin.from("match_availability").delete().in("player_id", profileIds);
    await admin.from("team_rosters").delete().in("player_id", profileIds);
    await admin.from("team_staff").delete().in("profile_id", profileIds);
    await admin.from("user_roles").delete().in("profile_id", profileIds);
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 500 });
    for (const user of authUsers.users) {
      if (user.email && user.email.startsWith("seed-")) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }
    await admin.from("profiles").delete().in("id", profileIds);
  }
  if (teamIds.length > 0) {
    await admin.from("teams").delete().in("id", teamIds);
  }
}

async function createAuthUser(email) {
  const password = "Morvedre2026!";
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 500 });
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

async function createProfile(id, profile, authUserId) {
  await admin.from("profiles").upsert({
    id,
    auth_user_id: authUserId,
    full_name: profile.full_name,
    birth_year: profile.birth_year ?? null,
    gender: profile.gender ?? "male",
    cap_number: profile.cap_number ?? null,
    license_active: profile.license_active ?? true,
    must_change_password: false,
    team_color: profile.team_color ?? null,
  }, { onConflict: "id" });
  if (profile.role) {
    await admin.from("user_roles").upsert({
      profile_id: id, role: profile.role, scope_team_id: profile.scope_team_id ?? null, granted_by: null,
    }, { onConflict: "profile_id,role,scope_team_id" });
  }
}

const TEAMS = [
  { code: "benjamin", label: "Benjamín", gender: "mixed", count: 10, weekday: 1, hour: 17, capMin: 1, capMax: 12, color: "#10B981" },
  { code: "alevin", label: "Alevín", gender: "mixed", count: 12, weekday: 3, hour: 17, capMin: 1, capMax: 14, color: "#F4C430" },
  { code: "infantil", label: "Infantil", gender: "mixed", count: 14, weekday: 1, hour: 18, capMin: 1, capMax: 14, color: "#FF6B35" },
  { code: "cadete", label: "Cadete A", gender: "male", count: 15, weekday: 3, hour: 19, capMin: 1, capMax: 15, color: "#1E5AA8" },
  { code: "cadete", label: "Cadete B", gender: "male", count: 13, weekday: 5, hour: 19, capMin: 1, capMax: 15, color: "#1E5AA8" },
  { code: "juvenil", label: "Juvenil", gender: "male", count: 15, weekday: 1, hour: 20, capMin: 1, capMax: 15, color: "#DC2626" },
  { code: "absoluto", label: "Absoluto", gender: "male", count: 16, weekday: 3, hour: 20, capMin: 1, capMax: 15, color: "#0F172A" },
  { code: "escuela", label: "Escuela", gender: "mixed", team_type: "school", count: 8, weekday: 2, hour: 17, capMin: 1, capMax: 12, color: "#A78BFA" },
];

const COACHES = [
  { name: "Vega Martínez", teamLabels: ["Benjamín"] },
  { name: "Vitaliy Petrov", teamLabels: ["Alevín", "Infantil", "Cadete A", "Absoluto"] },
  { name: "Rubén Gálvez", teamLabels: ["Cadete B", "Juvenil"] },
];

const DIRECTIVA = [
  { name: "Eva Sánchez" },
  { name: "Mónica Gil" },
  { name: "Sol Romero" },
  { name: "Pedro Martínez" },
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

async function main() {
  console.log("[seed] Starting clean seed...");
  await wipe();

  const batch = { profileIds: [], teamIds: [], trainingBlockIds: [], trainingSessionIds: [], matchIds: [] };

  // Season
  const { data: existingSeason } = await admin.from("seasons").select("id, is_current").eq("label", seasonLabel).maybeSingle();
  let seasonId;
  if (existingSeason) {
    seasonId = existingSeason.id;
    if (!existingSeason.is_current) {
      await admin.from("seasons").update({ is_current: false }).neq("id", seasonId);
      await admin.from("seasons").update({ is_current: true }).eq("id", seasonId);
    }
  } else {
    const { data, error } = await admin.from("seasons").insert({ label: seasonLabel, start_date: "2025-09-01", end_date: "2026-07-31", is_current: true }).select("id").single();
    if (error) throw error;
    seasonId = data.id;
  }
  console.log(`[seed] Season: ${seasonId}`);

  // Teams + rosters
  const teamIdByLabel = new Map();
  const playersByTeam = new Map();
  const coachIdByTeamLabel = new Map();

  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const teamId = randomUUID();
    const teamType = t.team_type ?? "competitive";
    await admin.from("teams").upsert({
      id: teamId, season_id: seasonId, category_code: t.code, label: t.label, gender: t.gender, team_type: teamType, color: t.color,
    }, { onConflict: "id" });
    batch.teamIds.push(teamId);
    teamIdByLabel.set(t.label, teamId);
    playersByTeam.set(t.label, []);

    const baseAge = t === TEAMS[0] || t === TEAMS[7] ? 10 : t === TEAMS[1] ? 12 : t === TEAMS[2] ? 14 : t === TEAMS[3] || t === TEAMS[4] ? 16 : t === TEAMS[5] ? 18 : 22;
    for (let p = 0; p < t.count; p++) {
      const playerId = randomUUID();
      const isFemale = Math.random() < 0.2;
      const birthYear = baseAge + (p % 3);
      const email = `seed-${playerId.slice(0, 8)}@example.com`;
      try {
        const authUserId = await createAuthUser(email);
        await createProfile(playerId, {
          full_name: fullName(i * 100 + p, isFemale ? "female" : "male"),
          birth_year: CURRENT_YEAR - birthYear,
          gender: isFemale ? "female" : "male",
          cap_number: t.capMin + (p % (t.capMax - t.capMin + 1)),
          license_active: true,
          team_color: t.color,
          role: "player",
        }, authUserId);
      } catch (e) {
        console.error(`[seed] Failed to create auth user ${email}: ${e.message}`);
        continue;
      }
      await admin.from("team_rosters").upsert({
        team_id: teamId, player_id: playerId, squad_number: t.capMin + (p % (t.capMax - t.capMin + 1)), joined_at: "2025-09-01",
      }, { onConflict: "team_id,player_id" });
      batch.profileIds.push(playerId);
      playersByTeam.get(t.label).push({ id: playerId });
    }
  }
  console.log(`[seed] Teams + rosters: ${TEAMS.length} teams, ${batch.profileIds.length} players`);

  // Coaches
  for (const c of COACHES) {
    const id = randomUUID();
    const email = `seed-coach-${id.slice(0, 8)}@example.com`;
    const coachAuthId = await createAuthUser(email);
    await createProfile(id, {
      full_name: c.name, birth_year: CURRENT_YEAR - 38, gender: "male", license_active: true, role: "coach",
    }, coachAuthId);
    batch.profileIds.push(id);
    for (const label of c.teamLabels) {
      const teamId = teamIdByLabel.get(label);
      if (teamId) {
        coachIdByTeamLabel.set(label, id);
        await admin.from("team_staff").upsert({
          team_id: teamId, profile_id: id, role: "head_coach", granted_by: null,
        }, { onConflict: "team_id,profile_id,role" });
      }
    }
  }
  console.log(`[seed] Coaches: ${COACHES.length}`);

  // Directiva
  for (const d of DIRECTIVA) {
    const id = randomUUID();
    const email = `seed-dir-${id.slice(0, 8)}@example.com`;
    const dirAuthId = await createAuthUser(email);
    await createProfile(id, {
      full_name: d.name, birth_year: CURRENT_YEAR - 45, gender: "female", license_active: false, role: "directiva",
    }, dirAuthId);
    batch.profileIds.push(id);
  }
  console.log(`[seed] Directiva: ${DIRECTIVA.length}`);

  // Delegates
  for (const d of DELEGATES) {
    const id = randomUUID();
    const email = `seed-del-${id.slice(0, 8)}@example.com`;
    const delAuthId = await createAuthUser(email);
    await createProfile(id, {
      full_name: d.name, birth_year: CURRENT_YEAR - 40, gender: "male", license_active: true, role: "delegate", scope_team_id: teamIdByLabel.get(d.teamLabel),
    }, delAuthId);
    batch.profileIds.push(id);
    const teamId = teamIdByLabel.get(d.teamLabel);
    if (teamId) {
      await admin.from("team_staff").upsert({
        team_id: teamId, profile_id: id, role: "delegate", granted_by: null,
      }, { onConflict: "team_id,profile_id,role" });
    }
  }
  console.log(`[seed] Delegates: ${DELEGATES.length}`);

  // Training
  const now = new Date();
  const startDate = new Date("2025-09-01T00:00:00Z");
  const endDate = new Date("2026-07-31T00:00:00Z");
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const blockId = randomUUID();
    const teamId = teamIdByLabel.get(t.label);
    if (!teamId) continue;
    await admin.from("training_blocks").upsert({
      id: blockId, team_id: teamId, label: `Temporada ${t.label}`,
      weekdays: [t.weekday, t.weekday === 5 ? 1 : t.weekday + 2],
      start_date: "2025-09-01", end_date: "2026-07-31",
      start_time: `${String(t.hour).padStart(2, "0")}:00`,
      end_time: `${String(t.hour + 1).padStart(2, "0")}:30`,
      kind: t.code === "escuela" ? "mixed" : "water", is_active: true, created_by: null,
    }, { onConflict: "id" });
    batch.trainingBlockIds.push(blockId);

    const attendance = [];
    for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      const monFirst = dow === 0 ? 7 : dow;
      if (monFirst !== t.weekday && monFirst !== (t.weekday === 5 ? 1 : t.weekday + 2)) continue;
      const isoDayStr = isoDay(d);
      const sessionId = randomUUID();
      const isPast = d < now;
      await admin.from("training_sessions").upsert({
        id: sessionId, block_id: blockId, team_id: teamId,
        scheduled_at: `${isoDayStr}T${String(t.hour).padStart(2, "0")}:00:00Z`,
        duration_minutes: 90, location: "Piscina Municipal",
      }, { onConflict: "id" });
      batch.trainingSessionIds.push(sessionId);
      if (isPast && Math.random() < 0.8) {
        for (const p of playersByTeam.get(t.label) ?? []) {
          attendance.push({
            session_id: sessionId, player_id: p.id, present: Math.random() > 0.15, marked_by: null, marked_at: d.toISOString(),
          });
        }
      }
    }
    if (attendance.length > 0) {
      await admin.from("training_attendance").upsert(attendance, { onConflict: "session_id,player_id" });
    }
  }
  console.log(`[seed] Training: ${batch.trainingBlockIds.length} blocks, ${batch.trainingSessionIds.length} sessions`);

  // Matches (incrementado a 15 partidos por equipo competitivo)
  const seasonStart = new Date("2025-09-15T00:00:00Z");
  const seasonEnd = new Date("2026-07-15T00:00:00Z");
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    if (t.code === "escuela") continue;
    const teamId = teamIdByLabel.get(t.label);
    if (!teamId) continue;
    const teamPlayers = playersByTeam.get(t.label) ?? [];
    if (teamPlayers.length < 5) continue;
    const coachId = coachIdByTeamLabel.get(t.label) || null;

    for (let j = 0; j < 15; j++) {
      const matchDate = randomDateBetween(seasonStart, seasonEnd);
      const isPast = matchDate < now;
      const isHome = (i + j) % 2 === 0;
      const matchId = randomUUID();
      const hour = 10 + (i % 3) * 3;
      const matchDateTime = new Date(matchDate);
      matchDateTime.setUTCHours(hour, 0, 0, 0);
      const comp = ["league", "cup", "tournament", "friendly"][j % 4];

      await admin.from("matches").upsert({
        id: matchId, season_id: seasonId, team_id: teamId,
        opponent: pick(OPPONENTS, i * 7 + j * 13),
        competition_type: comp, is_home: isHome,
        location: isHome ? "Piscina Municipal Puerto Sagunto" : "Piscina visitante",
        pool_name: "Piscina 25m", scheduled_at: isoDateTime(matchDateTime),
        status: isPast ? "played" : "scheduled",
        final_score_us: isPast ? Math.floor(Math.random() * 12) + 4 : null,
        final_score_them: isPast ? Math.floor(Math.random() * 10) + 3 : null,
      }, { onConflict: "id" });
      batch.matchIds.push(matchId);

      const numCallups = Math.min(13, teamPlayers.length);
      const shuffled = [...teamPlayers].sort(() => Math.random() - 0.5).slice(0, numCallups);
      const callups = shuffled.map((p, idx) => ({
        match_id: matchId, player_id: p.id, cap_number: idx + 1,
        status: isPast ? (Math.random() > 0.05 ? "confirmed" : "declined") : "called",
        confirmed_at: isPast ? matchDateTime.toISOString() : null,
        source_team_id: null,
      }));
      await admin.from("match_callups").upsert(callups, { onConflict: "match_id,player_id" });

      if (isPast) {
        // Asignación de goles y exclusiones
        const stats = shuffled.map((p) => ({
          match_id: matchId, player_id: p.id,
          goals: Math.random() < 0.4 ? Math.floor(Math.random() * 4) + 1 : 0,
          exclusions: Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0,
          mvp: false, // Se asignará el MVP del goleador máximo abajo
          entered_by: coachId,
          entered_at: matchDateTime.toISOString(),
          validated_by: coachId,
          validated_at: matchDateTime.toISOString(), // Muy importante: no nulo para que sume a rankings
        }));

        // Seleccionar jugador con más goles como MVP
        const maxGoals = Math.max(...stats.map((s) => s.goals));
        if (maxGoals > 0) {
          const topGoleadores = stats.filter((s) => s.goals === maxGoals);
          const mvpStat = pick(topGoleadores, matchId.charCodeAt(0));
          if (mvpStat) mvpStat.mvp = true;
        } else if (stats.length > 0) {
          stats[0].mvp = true;
        }

        await admin.from("match_stats").upsert(stats, { onConflict: "match_id,player_id" });
      }
    }
  }
  console.log(`[seed] Matches: ${batch.matchIds.length}`);

  // Availability
  const availability = [];
  for (const [, players] of playersByTeam) {
    for (const p of players) {
      if (Math.random() < 0.25) {
        const daysAhead = Math.floor(Math.random() * 45) + 1;
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() + daysAhead);
        const reasons = ["Viaje", "Estudios", "Lesión", "Examen", "Familiar"];
        availability.push({
          player_id: p.id, date: isoDay(date), available: false, reason: pick(reasons, p.id.charCodeAt(0) % 5),
        });
      }
    }
  }
  if (availability.length > 0) {
    await admin.from("match_availability").upsert(availability, { onConflict: "player_id,date" });
  }
  console.log(`[seed] Availability: ${availability.length}`);

  saveBatch(batch);

  console.log("");
  console.log("[seed] Done!");
  console.log(`  Total profiles: ${batch.profileIds.length}`);
  console.log(`  Players: ${batch.profileIds.length - COACHES.length - DIRECTIVA.length - DELEGATES.length}`);
  console.log(`  Coaches: ${COACHES.length}`);
  console.log(`  Directiva: ${DIRECTIVA.length}`);
  console.log(`  Delegates: ${DELEGATES.length}`);
  console.log("");
  console.log(`  All auth users have password: Morvedre2026!`);
  console.log(`  All emails start with 'seed-'`);
  console.log("");
  console.log("To clean up: re-run this script (it wipes by the saved batch IDs)");
}

main().catch((err) => {
  console.error("[seed] FATAL:", err);
  process.exit(1);
});

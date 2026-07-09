import {
  admin, url, serviceKey,
  loadBatch, saveBatch, mergeBatch,
  rand, randInt, randPick, pad2, isoDate,
  pickUniqueName, resetRng, SEED, CURRENT_YEAR, SEASON_LABEL,
  ADMIN_EMAIL,
} from "./base.mjs";
import { randomUUID } from "node:crypto";

const OPPONENTS = [
  "CN Elche", "CN Valencia", "CN Godella", "CN Petrer", "CE Mediterrani",
  "CW Castellon", "Askartza LE", "CN Sabadell Sur", "CN Terrassa", "CN Barcelona",
  "CN Sant Andreu", "CN Rubí", "CE Arenys de Munt", "CN Montjuïc", "CN Sallent",
  "CW Marbella", "CN Sevilla", "CN Jerez", "CN Málaga", "CD H2O El Ejido",
];

const TEAMS = [
  { code: "benjamin", label: "Benjamín", gender: "mixed", count: 20, weekday: 1, hour: 17, capMin: 1, capMax: 12, color: "#10B981", baseAge: 10 },
  { code: "alevin",   label: "Alevín",   gender: "mixed", count: 20, weekday: 3, hour: 17, capMin: 1, capMax: 14, color: "#F4C430", baseAge: 12 },
  { code: "infantil", label: "Infantil", gender: "mixed", count: 20, weekday: 1, hour: 18, capMin: 1, capMax: 14, color: "#FF6B35", baseAge: 14 },
  { code: "cadete",   label: "Cadete A", gender: "male",  count: 20, weekday: 3, hour: 19, capMin: 1, capMax: 15, color: "#1E5AA8", baseAge: 16 },
  { code: "cadete",   label: "Cadete B", gender: "male",  count: 20, weekday: 5, hour: 19, capMin: 1, capMax: 15, color: "#1E5AA8", baseAge: 16 },
  { code: "juvenil",  label: "Juvenil",  gender: "male",  count: 20, weekday: 1, hour: 20, capMin: 1, capMax: 15, color: "#DC2626", baseAge: 18 },
  { code: "absoluto", label: "Absoluto", gender: "male",  count: 20, weekday: 3, hour: 20, capMin: 1, capMax: 15, color: "#0F172A", baseAge: 22 },
  { code: "escuela",  label: "Escuela",  gender: "mixed", team_type: "school", count: 12, weekday: 2, hour: 17, capMin: 1, capMax: 12, color: "#A78BFA", baseAge: 8 },
];

const COACHES = [
  { name: "Vega Martínez",   email: "vega.martinez@morvedre-core.test",  gender: "female", teamLabels: ["Benjamín"] },
  { name: "Vitaliy Petrov",  email: "vitaliy.petrov@morvedre-core.test", gender: "male",   teamLabels: ["Alevín", "Infantil", "Cadete A", "Absoluto"] },
  { name: "Rubén Gálvez",    email: "ruben.galvez@morvedre-core.test",   gender: "male",   teamLabels: ["Cadete B", "Juvenil"] },
];

const DIRECTIVA = [
  { name: "Eva Sánchez",     email: "eva.sanchez@morvedre-core.test",     gender: "female", role_label: "Secretaria" },
  { name: "Mónica Gil",      email: "monica.gil@morvedre-core.test",      gender: "female", role_label: "Tesorera" },
  { name: "Sol Romero",      email: "sol.romero@morvedre-core.test",      gender: "female", role_label: "Tienda" },
  { name: "Pedro Martínez",  email: "pedro.martinez@morvedre-core.test",  gender: "male",   role_label: "Vocal" },
];

const DELEGATES = [
  { name: "Antonio López",     email: "antonio.lopez@morvedre-core.test",     teamLabel: "Benjamín" },
  { name: "Carmen Fernández",  email: "carmen.fernandez@morvedre-core.test",  teamLabel: "Alevín" },
  { name: "José Pérez",        email: "jose.perez@morvedre-core.test",        teamLabel: "Infantil" },
  { name: "Manuel García",     email: "manuel.garcia@morvedre-core.test",     teamLabel: "Cadete A" },
  { name: "Francisco Vidal",   email: "francisco.vidal@morvedre-core.test",   teamLabel: "Cadete B" },
  { name: "Juan Bravo",        email: "juan.bravo@morvedre-core.test",        teamLabel: "Juvenil" },
  { name: "Miguel Ángel Soler",email: "miguel.soler@morvedre-core.test",      teamLabel: "Absoluto" },
];

const PADRES_NOMBRES = [
  ...Array.from({ length: 80 }, (_, i) => ({
    name: pickUniqueName(i),
    email: `padre.madre.${pad2(i + 1)}@morvedre-core.test`,
  })),
];

async function createAuthUser(email) {
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 500 });
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Morvedre2026!",
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function createProfile(id, p, authUserId) {
  const { error } = await admin.from("profiles").upsert({
    id,
    auth_user_id: authUserId,
    full_name: p.full_name,
    birth_year: p.birth_year ?? null,
    gender: p.gender ?? "male",
    cap_number: p.cap_number ?? null,
    license_active: p.license_active ?? true,
    must_change_password: false,
    photo_url: null,
    team_color: p.team_color ?? null,
  }, { onConflict: "id" });
  if (error) throw error;
  if (p.user_role) {
    await admin.from("user_roles").upsert({
      profile_id: id,
      role: p.user_role,
      scope_team_id: p.scope_team_id ?? null,
      granted_by: null,
    }, { onConflict: "profile_id,role,scope_team_id" });
  }
}

function inferCategory(birthYear) {
  if (birthYear == null) return "cadete";
  const age = CURRENT_YEAR - birthYear;
  if (age <= 11) return "benjamin";
  if (age <= 13) return "alevin";
  if (age <= 15) return "infantil";
  if (age <= 17) return "cadete";
  if (age <= 19) return "juvenil";
  return "absoluto";
}

async function main() {
  resetRng();
  console.log("[players] Iniciando seeder de jugadores, equipos, staff...\n");

  const batch = loadBatch() ?? {};
  const teamIdByLabel = new Map(Object.entries(batch.teamIdByLabel ?? {}));
  const playerIds = new Set(batch.playerIds ?? []);
  const coachIds = new Set(batch.coachIds ?? []);
  const dirIds = new Set(batch.dirIds ?? []);
  const delIds = new Set(batch.delIds ?? []);

  // Season
  const { data: existingSeason } = await admin
    .from("seasons")
    .select("id, is_current")
    .eq("label", SEASON_LABEL)
    .maybeSingle();
  let seasonId;
  if (existingSeason) {
    seasonId = existingSeason.id;
    if (!existingSeason.is_current) {
      await admin.from("seasons").update({ is_current: false }).neq("id", seasonId);
      await admin.from("seasons").update({ is_current: true }).eq("id", seasonId);
    }
  } else {
    const { data, error } = await admin
      .from("seasons")
      .insert({ label: SEASON_LABEL, start_date: "2025-09-01", end_date: "2026-07-31", is_current: true })
      .select("id")
      .single();
    if (error) throw error;
    seasonId = data.id;
  }
  console.log(`[players] Season activa: ${seasonLabel(seasonId)}`);

  // Teams
  console.log("\n[players] Creando equipos...");
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const teamType = t.team_type ?? "competitive";
    const { data: existingTeam } = await admin
      .from("teams")
      .select("id")
      .eq("season_id", seasonId)
      .eq("label", t.label)
      .maybeSingle();
    let teamId;
    if (existingTeam) {
      teamId = existingTeam.id;
      await admin.from("teams").update({
        category_code: t.code, gender: t.gender, team_type: teamType, color: t.color,
      }).eq("id", teamId);
    } else {
      teamId = randomUUID();
      const { error } = await admin.from("teams").insert({
        id: teamId, season_id: seasonId, category_code: t.code, label: t.label,
        gender: t.gender, team_type: teamType, color: t.color,
      });
      if (error) throw error;
    }
    teamIdByLabel.set(t.label, teamId);
  }
  console.log(`[players] ${TEAMS.length} equipos OK`);

  // Players
  console.log("\n[players] Creando jugadores...");
  const playerIdByTeamLabel = new Map();
  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    const teamId = teamIdByLabel.get(t.label);
    const players = [];

    const usedCaps = new Set();
    for (let p = 0; p < t.count; p++) {
      const playerId = randomUUID();
      const isFemale = rand() < 0.3;
      const ageOffset = randInt(0, 2);
      const birthYear = CURRENT_YEAR - (t.baseAge + ageOffset);
      const email = `jugador.${slugifyLabel(t.label)}.${pad2(p + 1)}@morvedre-core.test`;

      let cap;
      if (rand() < 0.85 && usedCaps.size < t.capMax) {
        do { cap = randInt(t.capMin, t.capMax); } while (usedCaps.has(cap));
        usedCaps.add(cap);
      } else {
        cap = null;
      }

      const position = pickPosition();

      try {
        const authUserId = await createAuthUser(email);
        await createProfile(playerId, {
          full_name: pickUniqueName(p),
          birth_year: birthYear,
          gender: isFemale ? "female" : "male",
          cap_number: cap,
          license_active: rand() < 0.92,
          team_color: t.color,
        }, authUserId);
      } catch (e) {
        console.error(`  ! Jugador ${email}: ${e.message}`);
        continue;
      }

      const { error: rosErr } = await admin.from("team_rosters").upsert({
        team_id: teamId, player_id: playerId,
        squad_number: cap,
        joined_at: "2025-09-01",
        left_at: rand() < 0.08 ? randomDateInSeason(seasonId, 0.6) : null,
      }, { onConflict: "team_id,player_id" });
      if (rosErr) console.error(`  ! Roster ${email}: ${rosErr.message}`);

      players.push({ id: playerId, cap, name: "(seed)", email });
      playerIds.add(playerId);
    }
    playerIdByTeamLabel.set(t.label, players);
    console.log(`  - ${t.label}: ${players.length} jugadores`);
  }

  // Coaches
  console.log("\n[players] Creando entrenadores...");
  const coachIdByTeamLabel = new Map();
  for (const c of COACHES) {
    const id = randomUUID();
    try {
      const authUserId = await createAuthUser(c.email);
      await createProfile(id, {
        full_name: c.name,
        birth_year: CURRENT_YEAR - 40,
        gender: c.gender,
        license_active: true,
        user_role: "coach",
      }, authUserId);
    } catch (e) {
      console.error(`  ! Coach ${c.email}: ${e.message}`);
      continue;
    }
    coachIds.add(id);
    for (const label of c.teamLabels) {
      const teamId = teamIdByLabel.get(label);
      if (!teamId) continue;
      coachIdByTeamLabel.set(label, id);
      await admin.from("team_staff").upsert({
        team_id: teamId, profile_id: id, role: "head_coach", granted_by: null,
      }, { onConflict: "team_id,profile_id,role" });
    }
  }
  console.log(`[players] ${COACHES.length} entrenadores OK`);

  // Directiva
  console.log("\n[players] Creando directiva...");
  for (const d of DIRECTIVA) {
    const id = randomUUID();
    try {
      const authUserId = await createAuthUser(d.email);
      await createProfile(id, {
        full_name: d.name,
        birth_year: CURRENT_YEAR - 50,
        gender: d.gender,
        license_active: false,
        user_role: "admin",
      }, authUserId);
    } catch (e) {
      console.error(`  ! Directiva ${d.email}: ${e.message}`);
      continue;
    }
    dirIds.add(id);
  }
  console.log(`[players] ${DIRECTIVA.length} directivos OK`);

  // Delegates
  console.log("\n[players] Creando delegados...");
  for (const d of DELEGATES) {
    const id = randomUUID();
    try {
      const authUserId = await createAuthUser(d.email);
      await createProfile(id, {
        full_name: d.name,
        birth_year: CURRENT_YEAR - 45,
        gender: "male",
        license_active: true,
        user_role: "delegate",
        scope_team_id: teamIdByLabel.get(d.teamLabel) ?? null,
      }, authUserId);
    } catch (e) {
      console.error(`  ! Delegado ${d.email}: ${e.message}`);
      continue;
    }
    delIds.add(id);
    const teamId = teamIdByLabel.get(d.teamLabel);
    if (teamId) {
      await admin.from("team_staff").upsert({
        team_id: teamId, profile_id: id, role: "delegate", granted_by: null,
      }, { onConflict: "team_id,profile_id,role" });
    }
  }
  console.log(`[players] ${DELEGATES.length} delegados OK`);

  // Padres (parent profiles sin rol en user_roles, solo para parent_child_links)
  console.log("\n[players] Creando perfiles de padres/madres (sin rol)...");
  const parentIds = [];
  for (let i = 0; i < PADRES_NOMBRES.length; i++) {
    const p = PADRES_NOMBRES[i];
    const id = randomUUID();
    try {
      const authUserId = await createAuthUser(p.email);
      await createProfile(id, {
        full_name: p.name,
        birth_year: CURRENT_YEAR - randInt(35, 55),
        gender: rand() < 0.5 ? "male" : "female",
        license_active: false,
      }, authUserId);
    } catch (e) {
      continue;
    }
    parentIds.push(id);
  }
  console.log(`[players] ${parentIds.length} padres/madres OK`);

  // Save batch
  mergeBatch({
    playerIds: [...playerIds],
    coachIds: [...coachIds],
    dirIds: [...dirIds],
    delIds: [...delIds],
    parentIds,
    teamIdByLabel: Object.fromEntries(teamIdByLabel),
    coachIdByTeamLabel: Object.fromEntries(coachIdByTeamLabel),
    playerIdByTeamLabel: Object.fromEntries(
      [...playerIdByTeamLabel.entries()].map(([k, v]) => [k, v.map((p) => p.id)]),
    ),
  });

  console.log("\n[players] OK!");
  console.log(`  - Jugadores: ${playerIds.size}`);
  console.log(`  - Entrenadores: ${coachIds.size}`);
  console.log(`  - Directiva: ${dirIds.size}`);
  console.log(`  - Delegados: ${delIds.size}`);
  console.log(`  - Padres/madres: ${parentIds.length}`);
  console.log(`\n  Todos los emails usan password: Morvedre2026!`);
  console.log(`  Siguiente paso: node scripts/seed/parent-child.mjs`);
}

function pickPosition() {
  const positions = ["boyero", "extremo", "centro", "portero", "boyero", "extremo", "centro", "extremo"];
  return randPick(positions);
}

function slugifyLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function seasonLabel(seasonId) {
  return SEASON_LABEL;
}

function randomDateInSeason(seasonId, fraction) {
  const start = new Date("2025-09-01T00:00:00Z");
  const end = new Date("2026-07-31T00:00:00Z");
  return new Date(start.getTime() + (end.getTime() - start.getTime()) * fraction).toISOString();
}

main().catch((err) => {
  console.error("[players] FATAL:", err);
  process.exit(1);
});

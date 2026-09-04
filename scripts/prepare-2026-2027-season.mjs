#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
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
  console.error("Error: Faltan variables de Supabase en el entorno.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGET_SEASON = {
  label: "2026/2027",
  start_date: "2026-09-01",
  end_date: "2027-07-31",
};

const DEFAULT_TEAMS = [
  { label: "Benjamín", category: "benjamin", color: "#10B981", gender: "mixed", team_type: "competitive" },
  { label: "Alevín", category: "alevin", color: "#F4C430", gender: "mixed", team_type: "competitive" },
  { label: "Infantil", category: "infantil", color: "#FF6B35", gender: "mixed", team_type: "competitive" },
  { label: "Cadete A", category: "cadete", color: "#1E5AA8", gender: "male", team_type: "competitive" },
  { label: "Cadete B", category: "cadete", color: "#0F172A", gender: "male", team_type: "competitive" },
  { label: "Juvenil", category: "juvenil", color: "#DC2626", gender: "male", team_type: "competitive" },
  { label: "Absoluto", category: "absoluto", color: "#0F172A", gender: "male", team_type: "competitive" },
  { label: "Escuela", category: "escuela", color: "#A78BFA", gender: "mixed", team_type: "school" },
];

const isApply = process.argv.includes("--apply");
const isActivate = process.argv.includes("--activate");

async function main() {
  console.log(`=== Preparación de la temporada ${TARGET_SEASON.label} ===\n`);

  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id, label, start_date, end_date, is_current")
    .eq("is_current", true)
    .maybeSingle();

  console.log(`Temporada actual en DB: ${currentSeason?.label ?? "Ninguna"} (${currentSeason?.start_date} -> ${currentSeason?.end_date})`);

  const { data: existingTarget } = await supabase
    .from("seasons")
    .select("id, label, is_current")
    .eq("label", TARGET_SEASON.label)
    .maybeSingle();

  if (existingTarget) {
    console.log(`\nLa temporada ${TARGET_SEASON.label} ya existe en base de datos (id: ${existingTarget.id}, actual: ${existingTarget.is_current}).`);
  } else {
    console.log(`\nLa temporada ${TARGET_SEASON.label} NO existe todavía.`);
  }

  if (!isApply) {
    console.log(`\n[MODO SIMULACIÓN / DRY-RUN]`);
    console.log(`Acciones que se ejecutarán con '--apply':`);
    console.log(`1. Crear registro de temporada '${TARGET_SEASON.label}' (${TARGET_SEASON.start_date} al ${TARGET_SEASON.end_date})`);
    console.log(`2. Crear los ${DEFAULT_TEAMS.length} equipos estándar del club:`);
    for (const t of DEFAULT_TEAMS) {
      console.log(`   - ${t.label.padEnd(12)} (${t.category}, ${t.gender}, tipo: ${t.team_type})`);
    }
    if (isActivate) {
      console.log(`3. Activar como temporada actual via 'swap_current_season'`);
    } else {
      console.log(`3. La temporada se creará como inactiva hasta que se pase '--activate' con validación del club.`);
    }
    console.log(`\nPara aplicar los cambios reales, ejecuta: node scripts/prepare-2026-2027-season.mjs --apply`);
    return;
  }

  let seasonId = existingTarget?.id;

  if (!seasonId) {
    console.log(`Creando temporada ${TARGET_SEASON.label}...`);
    const { data: created, error: seasonErr } = await supabase
      .from("seasons")
      .insert({
        label: TARGET_SEASON.label,
        start_date: TARGET_SEASON.start_date,
        end_date: TARGET_SEASON.end_date,
        is_current: false,
      })
      .select("id")
      .single();

    if (seasonErr || !created) {
      console.error(`Error al crear la temporada: ${seasonErr?.message}`);
      process.exit(1);
    }
    seasonId = created.id;
    console.log(`  ✓ Temporada creada con éxito (id: ${seasonId})`);
  }

  console.log(`\nVerificando/creando equipos para ${TARGET_SEASON.label}...`);
  for (const t of DEFAULT_TEAMS) {
    const { data: teamExisting } = await supabase
      .from("teams")
      .select("id")
      .eq("season_id", seasonId)
      .eq("label", t.label)
      .maybeSingle();

    if (teamExisting) {
      console.log(`  ✓ Equipo ya existe: ${t.label}`);
    } else {
      const { data: teamCreated, error: teamErr } = await supabase
        .from("teams")
        .insert({
          season_id: seasonId,
          label: t.label,
          category_code: t.category,
          gender: t.gender,
          color: t.color,
          team_type: t.team_type,
          home_pool: "Piscina Municipal de Sagunto",
        })
        .select("id")
        .single();

      if (teamErr) {
        console.error(`  ✗ Error al crear equipo ${t.label}: ${teamErr.message}`);
      } else {
        console.log(`  ✓ Creado equipo ${t.label} (id: ${teamCreated.id})`);
      }
    }
  }

  if (isActivate) {
    console.log(`\nActivando temporada ${TARGET_SEASON.label} como temporada vigente...`);
    const { error: swapErr } = await supabase.rpc("swap_current_season", {
      new_season_id: seasonId,
    });
    if (swapErr) {
      console.error(`Error al activar temporada: ${swapErr.message}`);
      process.exit(1);
    }
    console.log(`  ✓ Temporada ${TARGET_SEASON.label} es ahora la temporada actual.`);
  } else {
    console.log(`\nLa temporada ${TARGET_SEASON.label} está preparada y lista para su apertura cuando el club lo decida.`);
    console.log(`Para activarla como actual, ejecuta: node scripts/prepare-2026-2027-season.mjs --apply --activate`);
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});

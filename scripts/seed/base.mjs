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

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

export const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const SEED = 20260707;
export const CURRENT_YEAR = 2026;
export const SEASON_LABEL = "2025/2026";
export const BATCH_FILE = resolve(ROOT, ".seed-batch.json");
export const ADMIN_EMAIL_EXPORT = ADMIN_EMAIL;

let rngState = SEED;
export function rand() {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState / 0x100000000;
}
export function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
export function randPick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
export function resetRng() {
  rngState = SEED;
}

export function loadBatch() {
  if (!existsSync(BATCH_FILE)) return null;
  try {
    return JSON.parse(readFileSync(BATCH_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function saveBatch(data) {
  mkdirSync(dirname(BATCH_FILE), { recursive: true });
  writeFileSync(BATCH_FILE, JSON.stringify(data, null, 2));
}

export function clearBatch() {
  if (existsSync(BATCH_FILE)) {
    writeFileSync(BATCH_FILE, "{}");
  }
}

export function mergeBatch(partial) {
  const current = loadBatch() ?? {};
  const merged = { ...current, ...partial };
  saveBatch(merged);
  return merged;
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function isoDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function isoDateTime(d) {
  return `${d.toISOString().slice(0, 19)}Z`;
}

export function randomDateBetween(start, end) {
  return new Date(start.getTime() + rand() * (end.getTime() - start.getTime()));
}

export function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const FIRST_NAMES_M = [
  "Hugo",
  "Mateo",
  "Martín",
  "Lucas",
  "Leo",
  "Daniel",
  "Alejandro",
  "Pablo",
  "Manuel",
  "Álvaro",
  "Adrián",
  "David",
  "Mario",
  "Bruno",
  "Izan",
  "Oliver",
  "Héctor",
  "Thiago",
  "Liam",
  "Marco",
  "Marc",
  "Nacho",
  "Joel",
  "Arnau",
  "Eric",
  "Pol",
  "Rayan",
  "Pau",
  "Saúl",
  "Iván",
  "Marc",
  "Joan",
  "Biel",
  "Jan",
  "Nil",
  "Gerard",
  "Oriol",
  "Aritz",
  "Xavi",
  "Iker",
  "Asier",
  "Ander",
  "Mikel",
  "Unai",
  "Gorka",
  "Eneko",
  "Aitor",
];
const FIRST_NAMES_F = [
  "Carmen",
  "Lucía",
  "Sofía",
  "Martina",
  "María",
  "Julia",
  "Paula",
  "Daniela",
  "Valeria",
  "Alba",
  "Emma",
  "Carla",
  "Sara",
  "Noa",
  "Laura",
  "Andrea",
  "Marta",
  "Claudia",
  "Elena",
  "Nora",
  "Vega",
  "Aroa",
  "Naia",
  "Ainara",
  "Maialen",
  "June",
  "Aitana",
  "Irene",
  "Ona",
  "Aitana",
  "Ariadna",
  "Cloe",
  "Olivia",
];
const LAST_NAMES = [
  "García",
  "Rodríguez",
  "Martínez",
  "López",
  "Sánchez",
  "Pérez",
  "Gómez",
  "Fernández",
  "Ruiz",
  "Hernández",
  "Jiménez",
  "Díaz",
  "Moreno",
  "Muñoz",
  "Romero",
  "Alonso",
  "Navarro",
  "Torres",
  "Domínguez",
  "Vázquez",
  "Ramos",
  "Gil",
  "Molina",
  "Serrano",
  "Blanco",
  "Pascual",
  "Gallego",
  "Vidal",
  "Bravo",
  "Carmona",
  "Iglesias",
  "Castro",
  "Cano",
  "Prieto",
  "Carmona",
  "Méndez",
  "León",
  "Vargas",
  "Ibarra",
  "Aguilar",
  "Crespo",
  "Rojas",
  "Bravo",
  "Esteve",
  "Solà",
  "Pujol",
  "Carbonell",
  "Ferrer",
  "Vila",
  "Vallès",
  "Pons",
];

export function pickUniqueName(_seed) {
  const isFemale = rand() < 0.3;
  const first = isFemale ? randPick(FIRST_NAMES_F) : randPick(FIRST_NAMES_M);
  const last1 = randPick(LAST_NAMES);
  const last2 = randPick(LAST_NAMES);
  if (last1 === last2) return `${first} ${last1}`;
  return `${first} ${last1} ${last2}`;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

export { ADMIN_EMAIL };

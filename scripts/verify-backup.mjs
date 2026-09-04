#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BACKUPS_DIR = resolve(ROOT, "backups");

const REQUIRED_TABLES = [
  "seasons",
  "teams",
  "team_staff",
  "team_rosters",
  "profiles",
  "user_roles",
  "parent_child_links",
  "training_blocks",
  "training_sessions",
  "training_attendance",
  "matches",
  "match_callups",
  "match_stats",
];

function getLatestBackupFile() {
  if (!existsSync(BACKUPS_DIR)) return null;
  const files = readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith(".json") && f.startsWith("morvedre-backup-"))
    .sort()
    .reverse();
  return files[0] ? resolve(BACKUPS_DIR, files[0]) : null;
}

const targetPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : getLatestBackupFile();

if (!targetPath || !existsSync(targetPath)) {
  console.error("Error: No se encontró ningún archivo de copia de seguridad para verificar.");
  process.exit(1);
}

console.log(`[Verify] Verificando copia: ${targetPath}`);

try {
  const raw = readFileSync(targetPath, "utf8");
  const payload = JSON.parse(raw);

  if (!payload.metadata || !payload.tables) {
    console.error("[Verify] ERROR: Formato inválido de copia. Faltan metadata o tables.");
    process.exit(1);
  }

  if (payload.metadata.sha256) {
    const preliminaryContent = JSON.stringify(payload.tables);
    const calculatedHash = createHash("sha256").update(preliminaryContent).digest("hex");
    if (calculatedHash !== payload.metadata.sha256) {
      console.error(`[Verify] ERROR: Checksum no coincide. Esperado: ${payload.metadata.sha256}, Calculado: ${calculatedHash}`);
      process.exit(1);
    }
    console.log(`[Verify]   ✓ Checksum SHA-256 verificado: ${calculatedHash}`);
  }

  const missingTables = REQUIRED_TABLES.filter((table) => !Array.isArray(payload.tables[table]));
  if (missingTables.length > 0) {
    console.error(`[Verify] ERROR: Faltan tablas críticas en la copia: ${missingTables.join(", ")}`);
    process.exit(1);
  }

  let totalRecords = 0;
  for (const rows of Object.values(payload.tables)) {
    totalRecords += rows.length;
  }

  console.log(`[Verify]   ✓ Tablas críticas presentes (${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length})`);
  console.log(`[Verify]   ✓ Tablas totales en backup: ${Object.keys(payload.tables).length}`);
  console.log(`[Verify]   ✓ Registros totales: ${totalRecords}`);
  console.log(`\n[Verify] Copia de seguridad íntegra y válida.`);
  process.exit(0);
} catch (err) {
  console.error("[Verify] ERROR al leer o parsear la copia:", err);
  process.exit(1);
}

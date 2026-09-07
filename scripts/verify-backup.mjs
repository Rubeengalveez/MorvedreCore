#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBackup } from "./lib/backup-data.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUPS_DIR = resolve(ROOT, "backups");

function getLatestBackupFile() {
  if (!existsSync(BACKUPS_DIR)) return null;
  const files = readdirSync(BACKUPS_DIR)
    .filter((file) => file.endsWith(".json") && file.startsWith("morvedre-backup-"))
    .sort()
    .reverse();
  return files[0] ? resolve(BACKUPS_DIR, files[0]) : null;
}

const targetPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : getLatestBackupFile();

try {
  if (!targetPath || !existsSync(targetPath))
    throw new Error("No se encontró ninguna copia para verificar.");
  const payload = JSON.parse(readFileSync(targetPath, "utf8"));
  const result = validateBackup(payload);
  console.log(
    `[Verify] Manifiesto, claves, recuentos y SHA-256 correctos: ${result.tablesCount} tablas, ${result.totalRecords} registros.`,
  );
  console.log(
    "[Verify] Integridad del archivo verificada. No acredita una restauración ni incluye Auth o archivos de Storage.",
  );
} catch (err) {
  console.error("[Verify] ERROR:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}

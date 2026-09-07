#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKUP_TABLE_KEYS, exportTable, hashTables, validateBackup } from "./lib/backup-data.mjs";

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
  console.error(
    "Error: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLES_TO_BACKUP = Object.keys(BACKUP_TABLE_KEYS);

const BACKUP_RETENTION_DAYS = 90;

async function runBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  console.log(`[Backup] Iniciando copia de seguridad de Morvedre Core: ${timestamp}`);

  const backupPayload = {
    metadata: {
      version: "1.2",
      timestamp: now.toISOString(),
      source: "Morvedre Core DB Exporter",
      tablesCount: TABLES_TO_BACKUP.length,
      sha256: "",
      rowCounts: {},
      scope: "public application tables; excludes Auth, Storage objects and private schemas",
      consistency: "paginated reads; not a transactional database snapshot",
    },
    tables: {},
  };

  let totalRecords = 0;
  const failedTables = [];

  for (const table of TABLES_TO_BACKUP) {
    try {
      const data = await exportTable(supabase, table, BACKUP_TABLE_KEYS[table]);
      totalRecords += data.length;
      backupPayload.tables[table] = data;
      backupPayload.metadata.rowCounts[table] = data.length;
      console.log(`[Backup]   ✓ ${table.padEnd(28)} (${data.length} registros)`);
    } catch (err) {
      console.error(`[Backup] ERROR fatal al leer "${table}":`, err);
      failedTables.push(table);
    }
  }

  if (failedTables.length > 0) {
    console.error(
      `\n[Backup] Error: Falló la exportación de ${failedTables.length} tablas: ${failedTables.join(", ")}`,
    );
    process.exit(1);
  }

  backupPayload.metadata.totalRecords = totalRecords;

  const outputDir = resolve(ROOT, "backups");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = `morvedre-backup-${timestamp}.json`;
  const filePath = resolve(outputDir, filename);

  const hash = hashTables(backupPayload.tables);
  backupPayload.metadata.sha256 = hash;
  validateBackup(backupPayload);

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  writeFileSync(filePath, jsonContent, "utf8");
  writeFileSync(`${filePath}.sha256`, `${hash}  ${filename}\n`, "utf8");

  console.log(`\n[Backup] Copia completada con éxito:`);
  console.log(`[Backup] Archivo local: backups/${filename}`);
  console.log(`[Backup] Total registros: ${totalRecords}`);
  console.log(`[Backup] SHA-256: ${hash}`);
  console.log(`[Backup] Tamaño: ${(Buffer.byteLength(jsonContent) / 1024).toFixed(2)} KB`);

  if (process.argv.includes("--upload")) {
    console.log(`[Backup] Subiendo copia al bucket de Supabase Storage...`);
    try {
      const { error: uploadError } = await supabase.storage
        .from("backups")
        .upload(filename, jsonContent, {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error(`[Backup] Error crítico al subir a Storage: ${uploadError.message}`);
        process.exit(1);
      }

      const checksumFilename = `${filename}.sha256`;
      const { error: checksumUploadError } = await supabase.storage
        .from("backups")
        .upload(checksumFilename, `${hash}  ${filename}\n`, {
          contentType: "text/plain",
          upsert: true,
        });

      if (checksumUploadError) {
        console.error(
          `[Backup] Error crítico al subir el checksum: ${checksumUploadError.message}`,
        );
        process.exit(1);
      }

      const { data: remoteFile, error: downloadError } = await supabase.storage
        .from("backups")
        .download(filename);

      if (downloadError || !remoteFile) {
        console.error(
          `[Backup] Error crítico al verificar la copia remota: ${downloadError?.message ?? "archivo vacío"}`,
        );
        process.exit(1);
      }

      const remotePayload = JSON.parse(await remoteFile.text());
      validateBackup(remotePayload);
      const remoteHash = hashTables(remotePayload.tables);

      if (remoteHash !== hash || remotePayload.metadata?.sha256 !== hash) {
        console.error("[Backup] Error crítico: la copia remota no supera la verificación SHA-256.");
        process.exit(1);
      }

      const cutoff = new Date(now.getTime() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const { data: storedFiles, error: listError } = await supabase.storage
        .from("backups")
        .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

      if (listError) {
        console.error(`[Backup] Error crítico al revisar la retención: ${listError.message}`);
        process.exit(1);
      }

      const expiredFiles = (storedFiles ?? [])
        .filter(
          (file) =>
            file.created_at &&
            new Date(file.created_at) < cutoff &&
            file.name.startsWith("morvedre-backup-"),
        )
        .map((file) => file.name);

      if (expiredFiles.length > 0) {
        const { error: removeError } = await supabase.storage.from("backups").remove(expiredFiles);
        if (removeError) {
          console.error(`[Backup] Error crítico al aplicar la retención: ${removeError.message}`);
          process.exit(1);
        }
      }

      console.log(`[Backup]   ✓ Subido y verificado en Storage privado: backups/${filename}`);
      console.log(
        `[Backup]   ✓ Retención de ${BACKUP_RETENTION_DAYS} días aplicada (${expiredFiles.length} archivos eliminados)`,
      );
    } catch (storageErr) {
      console.error(`[Backup] Error fatal al interactuar con Storage:`, storageErr);
      process.exit(1);
    }
  }
}

runBackup().catch((err) => {
  console.error("[Backup] Error fatal:", err);
  process.exit(1);
});

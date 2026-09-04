#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
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
  console.error("Error: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLES_TO_BACKUP = [
  "seasons",
  "teams",
  "team_staff",
  "team_rosters",
  "profiles",
  "user_roles",
  "profile_permissions",
  "parent_child_links",
  "training_blocks",
  "training_sessions",
  "training_attendance",
  "matches",
  "match_availability",
  "match_callups",
  "match_stats",
  "news_posts",
  "news_reactions",
  "shop_products",
  "shop_orders",
  "shop_order_items",
  "treasury_concepts",
  "treasury_profile_concepts",
  "treasury_period_closures",
  "treasury_lines",
  "travel_offers",
  "travel_reservations",
  "travel_companions",
  "historical_player_stats",
  "historical_team_matchups",
  "audit_log",
];

import { createHash } from "node:crypto";

async function runBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  console.log(`[Backup] Iniciando copia de seguridad de Morvedre Core: ${timestamp}`);

  const backupPayload = {
    metadata: {
      version: "1.1",
      timestamp: now.toISOString(),
      source: "Morvedre Core DB Exporter",
      tablesCount: TABLES_TO_BACKUP.length,
      sha256: "",
    },
    tables: {},
  };

  let totalRecords = 0;
  const failedTables = [];

  for (const table of TABLES_TO_BACKUP) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`[Backup] ERROR: No se pudo exportar la tabla "${table}": ${error.message}`);
        failedTables.push(table);
      } else {
        const count = data?.length ?? 0;
        totalRecords += count;
        backupPayload.tables[table] = data ?? [];
        console.log(`[Backup]   ✓ ${table.padEnd(28)} (${count} registros)`);
      }
    } catch (err) {
      console.error(`[Backup] ERROR fatal al leer "${table}":`, err);
      failedTables.push(table);
    }
  }

  if (failedTables.length > 0) {
    console.error(`\n[Backup] Error: Falló la exportación de ${failedTables.length} tablas: ${failedTables.join(", ")}`);
    process.exit(1);
  }

  backupPayload.metadata.totalRecords = totalRecords;

  const outputDir = resolve(ROOT, "backups");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = `morvedre-backup-${timestamp}.json`;
  const filePath = resolve(outputDir, filename);

  const preliminaryContent = JSON.stringify(backupPayload.tables);
  const hash = createHash("sha256").update(preliminaryContent).digest("hex");
  backupPayload.metadata.sha256 = hash;

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  writeFileSync(filePath, jsonContent, "utf8");
  writeFileSync(`${filePath}.sha256`, `${hash}  ${filename}\n`, "utf8");

  console.log(`\n[Backup] Copia completada con éxito:`);
  console.log(`[Backup] Archivo local: backups/${filename}`);
  console.log(`[Backup] Total registros: ${totalRecords}`);
  console.log(`[Backup] SHA-256: ${hash}`);
  console.log(`[Backup] Tamaño: ${(Buffer.byteLength(jsonContent) / 1024).toFixed(2)} KB`);

  // Opcional: Subida a Storage si se pasa argumento --upload
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
      } else {
        console.log(`[Backup]   ✓ Subido a Supabase Storage: backups/${filename}`);
      }
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

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODULES = {
  wipe: "wipe.mjs",
  players: "players.mjs",
  "parent-child": "parent-child.mjs",
  trainings: "trainings.mjs",
  matches: "matches.mjs",
  news: "news.mjs",
  shop: "shop.mjs",
  treasury: "treasury.mjs",
  travel: "travel.mjs",
  notifications: "notifications.mjs",
  availability: "availability.mjs",
  history: "history.mjs",
  "access-requests": "access-requests.mjs",
  recompute: "recompute.mjs",
  validate: "validate.mjs",
};

const ORDER = [
  "wipe",
  "players",
  "parent-child",
  "trainings",
  "matches",
  "news",
  "shop",
  "treasury",
  "travel",
  "notifications",
  "availability",
  "history",
  "access-requests",
  "recompute",
  "validate",
];

function runScript(file) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(__dirname, file)], {
      stdio: "inherit",
      shell: false,
    });
    child.on("close", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${file} exited with code ${code}`));
    });
  });
}

async function main() {
  const arg = process.argv[2] ?? "all";
  const onlyWipe = arg === "wipe";
  const modules = arg === "all" ? ORDER : [arg];

  if (!modules.every((m) => MODULES[m])) {
    console.error(`Modulo desconocido: ${arg}`);
    console.error(`Disponibles: ${Object.keys(MODULES).join(", ")}, all`);
    process.exit(1);
  }

  console.log(`\n[seed] Ejecutando: ${modules.join(" → ")}\n`);
  const start = Date.now();
  for (const m of modules) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ${m.toUpperCase()}`);
    console.log(`${"=".repeat(60)}\n`);
    await runScript(MODULES[m]);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n[seed] Terminado en ${elapsed}s`);
  if (onlyWipe) console.log("[seed] Para repoblar: node scripts/seed/index.mjs all");
}

main().catch((err) => {
  console.error("[seed] FATAL:", err);
  process.exit(1);
});

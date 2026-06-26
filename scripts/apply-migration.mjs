import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import pg from "pg";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase", "migrations");
const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log(`Connected. Applying ${FILES.length} migration(s)...`);

  for (const file of FILES) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`\n--- ${file} ---`);
    try {
      await client.query(sql);
      console.log(`OK: ${file}`);
    } catch (err) {
      console.error(`FAIL: ${file}`);
      console.error(err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("\nAll migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

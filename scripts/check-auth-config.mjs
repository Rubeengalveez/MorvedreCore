#!/usr/bin/env node
import dotenv from "dotenv";

dotenv.config({ path: ".env", override: false, quiet: true });
dotenv.config({ path: ".env.local", override: true, quiet: true });

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
];

function ok(message) {
  console.log(`  \u2713 ${message}`);
}

function fail(message) {
  console.log(`  \u2717 ${message}`);
}

function warn(message) {
  console.log(`  \u26a0 ${message}`);
}

function section(title) {
  console.log(`\n[${title}]`);
}

async function main() {
  section("1) Variables de entorno");
  let envOk = true;
  for (const key of REQUIRED) {
    const value = process.env[key];
    if (!value) {
      fail(`${key} no est\u00e1 definida`);
      envOk = false;
    } else {
      const display = key.includes("KEY") ? `${value.slice(0, 20)}...` : value;
      ok(`${key} = ${display}`);
    }
  }
  if (!envOk) {
    console.log("\nAseg\u00farate de que .env.local existe y tiene estas variables.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  section("2) Providers externos habilitados");
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const external = (data?.external ?? {});
    const enabled = Object.entries(external)
      .filter(([, cfg]) => cfg?.enabled)
      .map(([name]) => name);
    if (enabled.includes("google")) {
      ok("Google est\u00e1 habilitado en Supabase");
    } else if (enabled.length === 0) {
      warn("La API publica no expone providers habilitados; se valida con el smoke test.");
    } else {
      fail(`Google NO est\u00e1 habilitado. Activos: ${enabled.join(", ")}`);
    }
  } catch (err) {
    fail(`No se pudo consultar settings: ${err.message}`);
  }

  section("3) Smoke test de OAuth con Google");
  try {
    const redirectTo = `${appUrl}/api/auth/callback`;
    const res = await fetch(`${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`, {
      headers: { apikey: anonKey },
      redirect: "manual",
    });
    if (res.status === 302 || res.status === 303) {
      const location = res.headers.get("location") || "";
      if (location.includes("accounts.google.com") || location.includes("google.com")) {
        ok(`Redirige correctamente a Google (${location.slice(0, 80)}...)`);
      } else {
        warn(`Redirige a ${location.slice(0, 80)}... (inesperado)`);
      }
    } else if (res.status === 400) {
      const body = await res.text().catch(() => "");
      if (body.toLowerCase().includes("provider") || body.toLowerCase().includes("not enabled")) {
        fail("Google no est\u00e1 habilitado (error 400 del provider)");
      } else {
        warn(`Status 400: ${body.slice(0, 120)}`);
      }
    } else {
      warn(`Status inesperado: ${res.status}`);
    }
  } catch (err) {
    fail(`Smoke test fallido: ${err.message}`);
  }

  section("4) Conclusi\u00f3n");
  console.log("Si todo lo de arriba sale en verde, la configuraci\u00f3n de Google est\u00e1 bien.");
  console.log("Si hay rojo, sigue docs/auth-setup-google.md paso a paso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { createDemoSession } from "./lib/demo-session.mjs";

config({ path: ".env.local", quiet: true });
const base = process.env.ACTA_TEST_URL || "http://localhost:3002";
const dir = "tmp/acta-audit";
await mkdir(dir, { recursive: true });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const ids = { season: crypto.randomUUID(), team: crypto.randomUUID(), match: crypto.randomUUID() };
const players = Array.from({ length: 13 }, (_, i) => ({
  id: crypto.randomUUID(),
  full_name:
    [
      "Álex",
      "Marcos",
      "Pablo",
      "Hugo",
      "Rubén",
      "Nicolás",
      "Joan",
      "Diego",
      "Martín",
      "Lucas",
      "Daniel",
      "Sergio",
      "Adrián",
    ][i] + " Prueba acta",
  is_active: true,
}));
async function insert(table, data) {
  const r = await admin.from(table).insert(data);
  if (r.error) throw r.error;
}
let browser;
let session;
const results = [];
try {
  await insert("seasons", {
    id: ids.season,
    label: "Ensayo acta 2094",
    start_date: "2094-09-01",
    end_date: "2095-07-31",
    is_current: false,
  });
  await insert("teams", {
    id: ids.team,
    season_id: ids.season,
    category_code: "infantil",
    gender: "mixed",
    label: "Infantil · Prueba acta",
  });
  await insert("profiles", players);
  await insert("matches", {
    id: ids.match,
    season_id: ids.season,
    team_id: ids.team,
    opponent: "Rival de prueba",
    scheduled_at: "2094-10-01T12:00:00Z",
  });
  await insert(
    "match_callups",
    players.map((p, i) => ({
      match_id: ids.match,
      player_id: p.id,
      cap_number: i + 1,
      status: "called",
    })),
  );
  session = await createDemoSession();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  await context.addCookies(session.cookies);
  const page = await context.newPage();
  const errors = [];
  page.on("console",msg=>{if(msg.type()==="error")console.log("Navegador:",msg.text());});
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/acta?match=${ids.match}`);
  await page
    .getByRole("button", { name: "Empezar partido", exact: true })
    .waitFor({ timeout: 90000 });
  await page
    .getByRole("button", { name: "Empezar partido", exact: true })
    .click()
    .catch(async (e) => {
      console.log(await page.locator("main").innerText());
      await page.screenshot({ path: `${dir}/failure.png`, fullPage: true });
      throw e;
    });
  await page.getByRole("button", { name: /Morvedre, gorro 2,/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol en superioridad · 1+", exact: true }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 2,.*1 goles/ }).waitFor();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /Morvedre, gorro 3,/ }).click();
    await page.getByRole("button", { name: "Sanción", exact: true }).click();
    await page
      .getByRole("button", { name: "Penalti cometido · +1 expulsión", exact: true })
      .click();
  }
  await page.getByRole("button", { name: /Rival, gorro 9,/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Tiempo muerto / entrenador", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Morvedre", exact: true }).click();
  await page.getByRole("button", { name: "Tiempo muerto", exact: true }).click();
  await page.getByText("Todo sincronizado", { exact: false }).waitFor({ timeout: 60000 });
  results.push(
    "Gol superioridad, dos penaltis personales, gol rival y tiempo muerto registrados y sincronizados",
  );
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [430, 932],
    [768, 1024],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({ path: `${dir}/${width}x${height}.png`, fullPage: false });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Desbordamiento a ${width}x${height}`);
    const small = await page.locator("main button:enabled").evaluateAll((buttons) =>
      buttons
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && (r.width < 48 || r.height < 48);
        })
        .map((b) => b.textContent),
    );
    if (small.length) throw new Error(`Controles pequeños: ${small.join(",")}`);
    results.push(`${width}x${height}: sin desbordamiento y controles >=48px`);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole("button", { name: /Morvedre, gorro 7,/ }).click();
  await page.screenshot({ path: `${dir}/panel-320.png`, fullPage: false });
  await page.getByRole("button", { name: "Cerrar panel" }).click();
  if(process.env.ACTA_TEST_PRODUCTION) {
    console.log(await page.evaluate(async()=>({controlled:!!navigator.serviceWorker.controller,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({active:r.active?.state,installing:r.installing?.state})),caches:await caches.keys()})));
    await page.waitForFunction(()=>navigator.serviceWorker.controller?.state==="activated",{},{timeout:30000});
  }
  await context.setOffline(true);
  await page.getByRole("button", { name: /Morvedre, gorro 2,/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 2,.*2 goles/ }).waitFor();
  if (process.env.ACTA_TEST_PRODUCTION) {
    await page.reload();
    await page
      .getByRole("button", { name: /Morvedre, gorro 2,.*2 goles/ })
      .waitFor({ timeout: 30000 });
    results.push("Recarga completa sin conexión conserva jugadas y abre el acta");
  }
  await context.setOffline(false);
  await page.getByText("Todo sincronizado", { exact: false }).waitFor({ timeout: 60000 });
  const saved = await admin
    .from("match_stats")
    .select("goals,exclusions")
    .eq("match_id", ids.match)
    .eq("player_id", players[1].id)
    .single();
  if (saved.data?.goals !== 2) throw new Error("Sincronización offline incorrecta");
  results.push("Jugada offline sincronizada sin duplicar");
  await page.getByRole("button",{name:/Morvedre, gorro 1,/}).click();
  await page.getByRole("button",{name:"Penalti parado",exact:true}).click();
  await page.getByRole("button",{name:"Tiempo muerto / entrenador",exact:true}).click();
  await page.getByRole("dialog").getByRole("button",{name:"Rival",exact:true}).click();
  await page.getByRole("button",{name:"Roja al entrenador",exact:true}).click();
  await page.getByRole("button",{name:/Morvedre, gorro 3,/}).click();
  await page.getByRole("button",{name:"Sanción",exact:true}).click();
  await page.getByRole("button",{name:"Expulsión",exact:true}).click();
  await page.getByRole("button",{name:/Morvedre, gorro 3,.*3 de 3 expulsiones, fuera/}).waitFor();
  await page.getByRole("button",{name:"Ver jugadas",exact:true}).click();
  await page.getByRole("button",{name:"Anular jugada",exact:true}).first().click();
  await page.getByRole("button",{name:/Morvedre, gorro 3,.*2 de 3 expulsiones/}).waitFor();
  results.push("Penalti parado, roja al entrenador, tercera expulsión y anulación comprobados");
  for(let period=1;period<=6;period++){
    await page.getByRole("button",{name:new RegExp(`Periodo ${period}/6`)}).click();
    await page.getByRole("button",{name:period===6?"Confirmar y terminar partido":"Confirmar fin de periodo",exact:true}).click();
    if(period<6)await page.getByRole("button",{name:`Empezar periodo ${period+1}`,exact:true}).click();
  }
  await page.getByText("Todo sincronizado",{exact:false}).waitFor({timeout:60000});
  const final=await admin.from("matches").select("status,final_score_us,final_score_them").eq("id",ids.match).single();
  if(final.data?.status!=="played"||final.data?.final_score_us!==2||final.data?.final_score_them!==1)throw new Error("Cierre incorrecto");
  results.push("Seis periodos cerrados: resultado final 2-1 y estadísticas validadas");
  await page.getByRole("button", { name: "Compartir acta", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir o descargar PDF" }).click();
  const download = await downloadPromise;
  await download.saveAs(`${dir}/acta.pdf`);
  await page.getByRole("button", { name: "Cerrar panel" }).click();
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(`${dir}/results.json`, JSON.stringify(results, null, 2));
  console.log(results.join("\n"));
} finally {
  await browser?.close();
  await session?.client.auth.signOut({ scope: "local" });
  for (const [table, key, values] of [
    ["matches", "id", [ids.match]],
    ["ranking_snapshots", "season_id", [ids.season]],
    ["teams", "id", [ids.team]],
    ["profiles", "id", players.map((p) => p.id)],
    ["seasons", "id", [ids.season]],
  ]) {
    const { error } = await admin.from(table).delete().in(key, values);
    if (error) console.error(`Limpieza ${table}: ${error.message}`);
  }
}

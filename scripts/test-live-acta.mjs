import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createServer } from "node:http";
import { createDemoSession } from "./lib/demo-session.mjs";

config({ path: ".env.local", quiet: true });
const base = process.env.ACTA_TEST_URL || "http://localhost:3002";
const dir = "tmp/acta-audit";
await mkdir(dir, { recursive: true });
const measurementRoot = resolve("node_modules/@chenglou/pretext/dist");
const measurementServer = createServer(async (req, res) => {
  try {
    const target = resolve(
      measurementRoot,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (!target.startsWith(measurementRoot + sep)) throw new Error("Invalid path");
    const text = await readFile(target, "utf8");
    res.writeHead(200, { "Content-Type": "text/javascript", "Access-Control-Allow-Origin": "*" });
    res.end(text);
  } catch {
    res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
    res.end();
  }
});
await new Promise((resolve) => measurementServer.listen(0, "127.0.0.1", resolve));
const measurementUrl = `http://127.0.0.1:${measurementServer.address().port}/layout.js`;
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const ids = { season: crypto.randomUUID(), team: crypto.randomUUID(), match: crypto.randomUUID() };
const players = Array.from({ length: 14 }, (_, i) => ({
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
      "Víctor",
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
  const duplicateAttempt = await admin
    .from("match_callups")
    .update({ cap_number: 2 })
    .eq("match_id", ids.match)
    .eq("player_id", players[0].id);
  if (duplicateAttempt.error?.code !== "23514") throw new Error("Se permite repetir gorro");
  results.push("La base de datos impide asignar un gorro ocupado");
  const race = await Promise.all(
    players
      .slice(0, 2)
      .map((player) =>
        admin
          .from("match_callups")
          .update({ cap_number: 98 })
          .eq("match_id", ids.match)
          .eq("player_id", player.id),
      ),
  );
  if (
    race.filter((result) => !result.error).length !== 1 ||
    race.filter((result) => result.error?.code === "23514").length !== 1
  )
    throw new Error("Dos ediciones simultáneas pueden repetir gorro");
  for (let i = 0; i < 2; i++) {
    const reset = await admin
      .from("match_callups")
      .update({ cap_number: i + 1 })
      .eq("match_id", ids.match)
      .eq("player_id", players[i].id);
    if (reset.error) throw reset.error;
  }
  results.push("Dos ediciones simultáneas: solo una puede reservar el gorro");
  session = await createDemoSession();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  await context.addCookies(session.cookies);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("Navegador:", msg.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/matches/${ids.match}`);
  if (await page.getByRole("region", { name: "Acta del delegado" }).count())
    throw new Error("Entrada visible sin ser delegado");
  const network = await context.newCDPSession(page);
  await network.send("Network.enable");
  await network.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 1200,
    downloadThroughput: 10000000,
    uploadThroughput: 10000000,
  });
  await page.goto(`${base}/acta?match=${ids.match}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Preparando tu acta…" }).waitFor();
  await page.screenshot({ path: `${dir}/carga-acta.png` });
  await network.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  await page.getByRole("alert").filter({ hasText: "reservada al delegado" }).waitFor();
  await page.getByRole("link", { name: "Volver al partido" }).click();
  if (!page.url().endsWith(`/matches/${ids.match}`))
    throw new Error("Salir lleva al administrador");
  const me = await session.client.auth.getUser();
  const profile = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", me.data.user.id)
    .single();
  if (profile.error) throw profile.error;
  await insert("team_staff", { team_id: ids.team, profile_id: profile.data.id, role: "delegate" });
  await page.reload();
  await page.getByRole("region", { name: "Acta del delegado" }).waitFor();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({ path: `${dir}/entrada-${width}.png` });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error("Entrada desbordada");
  }
  await page.getByRole("link", { name: /Solo goles y expulsiones/ }).click();
  await page.getByRole("heading", { name: "Goles y expulsiones", exact: true }).waitFor();
  if (page.url().includes("/admin")) throw new Error("Registro sencillo abre administración");
  await page.getByRole("link", { name: "Volver al partido" }).click();
  await page.getByRole("link", { name: /Abrir acta en directo/ }).click();
  results.push("Acceso exclusivo del delegado, vuelta al partido y registro sencillo comprobados");
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
  await page.getByRole("button", { name: /4 Hugo Prueba acta/ }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 2,.*1 goles/ }).waitFor();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /Morvedre, gorro 3,/ }).click();
    await page.getByRole("button", { name: "Expulsión / tarjeta", exact: true }).click();
    await page
      .getByRole("button", { name: "Penalti cometido · +1 expulsión", exact: true })
      .click();
  }
  await page.getByRole("button", { name: /Rival, gorro 9,/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: /Rival, gorro 10,/ }).click();
  await page.getByRole("button", { name: "Penalti · +1 expulsión", exact: true }).click();
  await page.getByRole("button", { name: /5 Rubén Prueba acta/ }).click();
  await page.getByRole("button", { name: "Fallo", exact: true }).click();
  await page.getByRole("button", { name: "Tiempo muerto", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Morvedre · 0 pedidos/, exact: true })
    .click();
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 60000 });
  results.push(
    "Gol con asistencia, dos penaltis personales, penalti rival con fallo, gol rival y tiempo muerto sincronizados",
  );
  await page.getByText("Tiempo muerto registrado", { exact: true }).waitFor({ state: "hidden" });
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [375, 667],
    [390, 844],
    [393, 852],
    [412, 915],
    [430, 932],
    [768, 1024],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      const pane = document.querySelector("[data-acta-scroll]");
      if (pane) pane.scrollTop = 0;
    });
    const measured = await page.evaluate(async (moduleUrl) => {
      const { prepare, layout } = await import(moduleUrl);
      return [...document.querySelectorAll("footer button")]
        .filter((b) => !b.disabled)
        .map((b) => {
          const c = getComputedStyle(b);
          const width = b.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
          const font = `${c.fontWeight} ${c.fontSize} ${c.fontFamily}`;
          const measured = layout(
            prepare(b.textContent.trim(), font),
            width,
            parseFloat(c.lineHeight),
          );
          return {
            label: b.textContent.trim(),
            fits:
              measured.height <=
              b.clientHeight - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom) + 1,
          };
        });
    }, measurementUrl);
    if (measured.some((m) => !m.fits))
      throw new Error(`Texto no cabe a ${width}: ${JSON.stringify(measured)}`);
    await page.screenshot({ path: `${dir}/${width}x${height}.png`, fullPage: false });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Desbordamiento a ${width}x${height}`);
    const paneOverflow = await page
      .locator("[data-acta-scroll]")
      .evaluate((p) => p.scrollWidth > p.clientWidth);
    if (paneOverflow) throw new Error(`Tabla desbordada a ${width}`);
    if (width === 375) {
      const visible = await page
        .getByRole("button", { name: /Morvedre, gorro/ })
        .evaluateAll((rows) => {
          const area = document.querySelector("[data-acta-scroll]").getBoundingClientRect();
          const footerTop = document.querySelector("footer").getBoundingClientRect().top;
          const visibleBottom = Math.min(innerHeight, footerTop);
          return rows.filter((r) => {
            const b = r.getBoundingClientRect();
            return b.top >= area.top && b.bottom <= area.bottom && b.bottom <= visibleBottom;
          }).length;
        });
      if (visible < 4) throw new Error(`Solo ${visible} jugadores visibles a 375px`);
      results.push(
        `${visible} jugadores propios visibles completos a 375px, sin avisos encima de las celdas`,
      );
    }
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
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "24px";
  });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw new Error("Desbordamiento con texto al 150%");
  await page.screenshot({ path: `${dir}/texto-150.png` });
  const enlargedBody = await page.locator("[data-acta-body]").boundingBox();
  if (!enlargedBody || enlargedBody.height < 200)
    throw new Error("La lista desaparece al ampliar el texto");
  await page.getByRole("button", { name: /Morvedre, gorro 1,/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dir}/texto-150-estadisticas.png` });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
    document.getElementById("main-content").scrollTop = 0;
  });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw new Error("Desbordamiento con texto al 200%");
  const clippedControls = await page
    .locator("footer button")
    .evaluateAll((buttons) =>
      buttons
        .filter(
          (button) =>
            button.scrollWidth > button.clientWidth || button.scrollHeight > button.clientHeight,
        )
        .map((button) => button.textContent?.trim()),
    );
  if (clippedControls.length)
    throw new Error(`Controles recortados con texto al 200%: ${clippedControls.join(", ")}`);
  await page.screenshot({ path: `${dir}/texto-200.png`, fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
    document.getElementById("main-content").scrollTop = 0;
  });
  await page.getByRole("button", { name: "Terminar cuarto", exact: true }).click();
  await page.screenshot({ path: `${dir}/terminar-cuarto-320.png` });
  for (let n = 0; n < 6; n++) {
    await page.keyboard.press("Tab");
    const visible = await page.evaluate(() => {
      const r = document.activeElement.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    });
    if (!visible) throw new Error("Foco de teclado oculto en fin de cuarto");
  }
  await page.getByRole("button", { name: "Seguir anotando", exact: true }).click();
  results.push(
    "Terminar cuarto visible sin menús; cancelar conserva el cuarto; teclado y texto al 150% y 200% comprobados",
  );
  await page.getByRole("button", { name: /Morvedre, gorro 7,/ }).click();
  await page.screenshot({ path: `${dir}/panel-320.png`, fullPage: false });
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  if (process.env.ACTA_TEST_PRODUCTION) {
    console.log(
      await page.evaluate(async () => ({
        controlled: !!navigator.serviceWorker.controller,
        registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => ({
          active: r.active?.state,
          installing: r.installing?.state,
        })),
        caches: await caches.keys(),
      })),
    );
    await page.waitForFunction(
      () => navigator.serviceWorker.controller?.state === "activated",
      {},
      { timeout: 30000 },
    );
  }
  await context.setOffline(true);
  await page.getByRole("button", { name: /Morvedre, gorro 2,/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  await page.getByRole("button", { name: "Seguir sin asistencia", exact: true }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 2,.*2 goles/ }).waitFor();
  if (process.env.ACTA_TEST_PRODUCTION) {
    await page.reload();
    await page
      .getByRole("button", { name: /Morvedre, gorro 2,.*2 goles/ })
      .waitFor({ timeout: 30000 });
    results.push("Recarga completa sin conexión conserva jugadas y abre el acta");
  }
  await context.setOffline(false);
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 60000 });
  const saved = await admin
    .from("match_stats")
    .select("goals,exclusions")
    .eq("match_id", ids.match)
    .eq("player_id", players[1].id)
    .single();
  if (saved.data?.goals !== 2) throw new Error("Sincronización offline incorrecta");
  results.push("Jugada offline sincronizada sin duplicar");
  await page.getByRole("button", { name: /Morvedre, gorro 1,/ }).click();
  await page.getByRole("button", { name: "Penalti parado", exact: true }).click();
  await page.getByRole("button", { name: "Tiempo muerto", exact: true }).click();
  await page.getByRole("button", { name: "Tarjeta al entrenador", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rival · 0 pedidos/, exact: true })
    .click();
  await page.getByRole("button", { name: "Roja al entrenador", exact: true }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 3,/ }).click();
  await page.getByRole("button", { name: "Expulsión / tarjeta", exact: true }).click();
  await page.getByRole("button", { name: "Expulsión", exact: true }).click();
  await page
    .getByRole("button", { name: /Morvedre, gorro 3,.*3 de 3 expulsiones, fuera/ })
    .waitFor();
  await page.getByRole("button", { name: "Corregir jugadas", exact: true }).click();
  await page.getByRole("button", { name: "Anular", exact: true }).first().click();
  await page.getByRole("button", { name: "Sí, anular esta jugada", exact: true }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 3,.*2 de 3 expulsiones/ }).waitFor();
  results.push("Penalti parado, roja al entrenador, tercera expulsión y anulación comprobados");
  for (let period = 1; period <= 6; period++) {
    await page
      .getByRole("button", {
        name: period === 6 ? "Terminar partido" : "Terminar cuarto",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: period === 6 ? "Sí, terminar partido" : `Sí, terminar cuarto ${period}`,
        exact: true,
      })
      .click();
    if (period < 6)
      await page.getByRole("button", { name: `Empezar cuarto ${period + 1}`, exact: true }).click();
  }
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 60000 });
  const final = await admin
    .from("matches")
    .select("status,final_score_us,final_score_them")
    .eq("id", ids.match)
    .single();
  if (
    final.data?.status !== "played" ||
    final.data?.final_score_us !== 2 ||
    final.data?.final_score_them !== 1
  )
    throw new Error("Cierre incorrecto");
  results.push("Seis periodos cerrados: resultado final 2-1 y estadísticas validadas");
  await page.getByRole("button", { name: "Compartir acta", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir o descargar PDF" }).click();
  const download = await downloadPromise;
  await download.saveAs(`${dir}/acta.pdf`);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(`${dir}/results.json`, JSON.stringify(results, null, 2));
  console.log(results.join("\n"));
} finally {
  measurementServer.close();
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

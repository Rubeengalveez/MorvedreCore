import { test, expect, type Page } from "@playwright/test";
import type { StoredMatch } from "../../lib/pwa/live-match-store";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fixture = (): StoredMatch => ({
  matchId: id(800),
  owner: id(900),
  viewer: id(900),
  canEdit: true,
  team: "Infantil · Prueba local",
  opponent: "Rival de prueba",
  date: "2026-09-30T18:00:00Z",
  revision: 0,
  mutation: id(700),
  device: id(600),
  dirty: false,
  sheet: {
    version: 4,
    category: "infantil",
    players: Array.from({ length: 14 }, (_, i) => ({
      id: id(i + 1),
      cap: i + 1,
      name: `Jugador ${i + 1}`,
    })),
    opponentCaps: Array.from({ length: 14 }, (_, i) => i + 1),
    periods: 6,
    period: 1,
    phase: "ready",
    keeper: 1,
    events: [],
    baseline: [],
    baselineThem: 0,
    pending: null,
    participation: {
      rulesVersion: 1,
      enabled: true,
      opponentConfirmed: false,
      fixedKeepers: { us: null, them: null },
      lineups: [],
      changes: [],
    },
  },
});

async function openLocal(page: Page, record: StoredMatch) {
  await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false }));
  await page.goto("/offline");
  await page.evaluate(async (r) => {
    localStorage.setItem("morvedre-acta-device", r.device);
    await new Promise<void>((resolve, reject) => {
      const q = indexedDB.open("morvedre-live-acta-v1", 1);
      q.onupgradeneeded = () => q.result.createObjectStore("matches", { keyPath: "matchId" });
      q.onsuccess = () => {
        const db = q.result;
        const tx = db.transaction("matches", "readwrite");
        tx.objectStore("matches").put(r);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      q.onerror = () => reject(q.error);
    });
  }, record);
  await page.goto(`/acta?match=${record.matchId}`);
}

async function readLocal(page: Page): Promise<StoredMatch> {
  return page.evaluate(
    async (key) =>
      new Promise<StoredMatch>((resolve, reject) => {
        const q = indexedDB.open("morvedre-live-acta-v1", 1);
        q.onsuccess = () => {
          const db = q.result;
          const r = db.transaction("matches").objectStore("matches").get(key);
          r.onsuccess = () => {
            db.close();
            resolve(r.result);
          };
          r.onerror = () => reject(r.error);
        };
        q.onerror = () => reject(q.error);
      }),
    id(800),
  );
}

test("recupera el borrador y anota tras recargar sin red", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openLocal(page, fixture());
  await page.getByRole("button", { name: "Empezar partido", exact: true }).click();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  for (const n of [1, 2, 3, 4])
    await page.getByRole("button", { name: `${n} Jugador ${n}`, exact: true }).click();
  await page.getByRole("button", { name: "Cerrar aviso" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Empezar partido", exact: true }).click();
  await expect(page.getByRole("button", { name: "2 Jugador 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const n of [5, 6, 7])
    await page.getByRole("button", { name: `${n} Jugador ${n}`, exact: true }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  for (const n of [1, 2, 3, 4, 5, 6, 7])
    await page.getByRole("button", { name: String(n), exact: true }).click();
  await page.getByRole("button", { name: "Listo, empezar cuarto" }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 9, Jugador 9/ }).click();
  await expect(page.getByRole("heading", { name: "¿Está jugando este cuarto?" })).toBeVisible();
  await page.getByRole("button", { name: "Sí, revisar jugadores" }).click();
  await page.getByRole("button", { name: "2 Jugador 2", exact: true }).click();
  await page.getByRole("button", { name: "9 Jugador 9", exact: true }).click();
  await page.getByRole("button", { name: "Guardar selección" }).click();
  await expect(page.getByRole("button", { name: "Gol", exact: true })).toBeVisible();
  expect((await readLocal(page)).sheet.events).toHaveLength(0);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "Revisar participación", exact: true }).click();
  await page.getByRole("button", { name: "Corregir cuarto 1" }).click();
  await expect(page.getByRole("button", { name: "Guardar selección" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  await page.getByRole("button", { name: "Cerrar aviso" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Morvedre, gorro 9, Jugador 9/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  await page.getByRole("button", { name: "Gol sin asistencia", exact: true }).click();
  expect((await readLocal(page)).sheet.events.filter((e) => e.kind === "goal")).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Morvedre, gorro 9, Jugador 9, 1 goles/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Terminar cuarto", exact: true }).click();
  await page.getByRole("button", { name: "Sí, terminar cuarto 1", exact: true }).click();
  await page.getByRole("button", { name: "Toca aquí para empezar el cuarto 2", exact: true }).click();
  for (const n of [13, 8, 9, 10, 11, 12, 14])
    await page.getByRole("button", { name: new RegExp(`^${n} Jugador ${n}\\b`) }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  for (const n of [13, 8, 9, 10, 11, 12, 14])
    await page.getByRole("button", { name: new RegExp(`^${n}\\b`) }).click();
  await page.getByRole("button", { name: "Listo, empezar cuarto" }).click();
  const second = await readLocal(page);
  expect(second.sheet).toMatchObject({ period: 2, phase: "playing", keeper: 13 });
  expect(second.sheet.participation!.lineups).toHaveLength(4);
  await page.reload();
  await expect(page.getByRole("button", { name: "Terminar cuarto", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("avisa en el cuarto 4 de ambos equipos y permite registrar una incidencia", async ({
  page,
}) => {
  const record = fixture();
  record.sheet.period = 3;
  record.sheet.phase = "break";
  record.sheet.participation!.opponentConfirmed = true;
  for (const period of [1, 2, 3]) {
    record.sheet.participation!.lineups.push(
      { period, side: "us", keeper: id(1), field: [2, 3, 4, 5, 6, 7].map(id) },
      { period, side: "them", keeper: "1", field: [2, 3, 4, 5, 6, 7].map(String) },
    );
  }
  await openLocal(page, record);
  await expect(page.getByText(/Morvedre: 7 deben descansar/)).toBeVisible();
  await expect(page.getByText(/Rival: 7 deben descansar/)).toBeVisible();
  await page.getByRole("button", { name: "Elegir jugadores del cuarto 4" }).click();
  for (const n of [1, 2, 3, 4, 5, 6, 7])
    await page.getByRole("button", { name: new RegExp(`^${n} Jugador ${n}\\b`) }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  for (const n of [1, 2, 3, 4, 5, 6, 7])
    await page.getByRole("button", { name: new RegExp(`^${n}\\b`) }).click();
  await page.getByRole("button", { name: "Listo, empezar cuarto" }).click();
  await expect(page.getByRole("heading", { name: "Revisa la rotación" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/Morvedre · Jugador 2: Ya jugó 3/)).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText(/Rival · Gorro 9: Todavía no ha jugado/),
  ).toBeAttached();
  await page.getByRole("button", { name: "Registrar así y empezar" }).click();
  await expect(page.getByRole("button", { name: "Terminar cuarto", exact: true })).toBeEnabled();
  const saved = await readLocal(page);
  expect(saved.sheet.period).toBe(4);
  expect(
    saved.sheet
      .participation!.lineups.filter((l) => l.period === 4)
      .every((l) => Boolean(l.incident)),
  ).toBe(true);
});

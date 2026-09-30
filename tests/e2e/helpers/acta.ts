import { expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import type { StoredMatch } from "../../../lib/pwa/live-match-store";

export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const fixture = (): StoredMatch => ({
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

export async function openLocal(page: Page, record: StoredMatch) {
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

export async function readLocal(page: Page): Promise<StoredMatch> {
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

export async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.screenshot({ path: `tmp/acta-audit/youth-redesign-${name}.png` });
  const mobile = await page.evaluate(() => {
    const root = document.querySelector('[role="dialog"]') ?? document;
    const smallTargets = [
      ...root.querySelectorAll<HTMLElement>('button, a[href], select, input[type="search"]'),
    ]
      .filter(
        (element) =>
          !element.matches(":disabled") && !element.closest('[aria-hidden="true"], [inert]'),
      )
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (
          !rect.width ||
          !rect.height ||
          rect.bottom <= 0 ||
          rect.top >= innerHeight ||
          getComputedStyle(element).visibility === "hidden"
        )
          return [];
        return rect.width < 47.5 || rect.height < 47.5
          ? [
              {
                name: element.getAttribute("aria-label") ?? element.textContent?.trim(),
                width: rect.width,
                height: rect.height,
              },
            ]
          : [];
      });
    return { smallTargets, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  writeFileSync(`tmp/acta-audit/mobile-${name}.json`, JSON.stringify(mobile, null, 2));
  expect(mobile).toEqual({ smallTargets: [], overflow: false });
  if (process.env.ACTA_AXE_PATH) {
    await page.addScriptTag({ path: process.env.ACTA_AXE_PATH });
    const report = await page.evaluate<{
      violations: { id: string; nodes: { target: string[] }[] }[];
    }>(
      "axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })",
    );
    writeFileSync(`tmp/acta-audit/accessibility-${name}.json`, JSON.stringify(report, null, 2));
    expect(
      report.violations.map((violation: { id: string; nodes: { target: string[] }[] }) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
}

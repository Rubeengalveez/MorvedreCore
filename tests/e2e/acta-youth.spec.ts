import { test, expect } from "@playwright/test";
import { fixture, id, openLocal, readLocal, capture } from "./helpers/acta";

test("recupera el borrador y anota tras recargar sin red", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openLocal(page, fixture());
  await page.getByRole("button", { name: "Empezar partido", exact: true }).click();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  for (const n of [1, 2, 3, 4])
    await page.getByRole("button", { name: `${n} Jugador ${n}`, exact: true }).click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Empezar partido", exact: true }).click();
  await expect(page.getByRole("button", { name: "2 Jugador 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const n of [5, 6, 7])
    await page.getByRole("button", { name: `${n} Jugador ${n}`, exact: true }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  await expect(page.getByRole("heading", { name: "Portero", exact: true })).toBeInViewport();
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
  await page.getByRole("button", { name: "Corregir jugadas" }).click();
  await page.getByRole("button", { name: "Revisar participación", exact: true }).click();
  await page.getByRole("button", { name: "Corregir cuarto 1" }).click();
  await expect(page.getByRole("button", { name: "Guardar selección" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
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
  await page
    .getByRole("button", { name: "Toca aquí para empezar el cuarto 2", exact: true })
    .click();
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

test("móvil corto: selección, foco de teclado y movimiento reducido", async ({ page }) => {
  const record = fixture();
  record.sheet.participation!.opponentConfirmed = true;
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLocal(page, record);
  await page.getByRole("button", { name: "Empezar partido", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continuar con Rival" })).toBeInViewport();
  await expect(page.getByRole("heading", { name: "Portero", exact: true })).toBeInViewport();
  await page.keyboard.press("Tab");
  expect(
    await page.getByRole("dialog").evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true);
  await capture(page, "selection-short-phone-320");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Empezar partido", exact: true })).toBeFocused();
});

test("del cuarto 4 al 5 recupera el acta normal, también tras recargar sin red", async ({
  page,
  context,
}) => {
  const record = fixture();
  record.sheet.phase = "break";
  record.sheet.period = 4;
  record.sheet.keeper = 13;
  record.sheet.participation!.opponentConfirmed = true;
  for (const period of [1, 2, 3, 4]) {
    const keeper = period % 2 ? 1 : 13;
    const field = period % 2 ? [2, 3, 4, 5, 6, 7] : [8, 9, 10, 11, 12, 14];
    record.sheet.participation!.lineups.push(
      { period, side: "us", keeper: id(keeper), field: field.map(id) },
      { period, side: "them", keeper: String(keeper), field: field.map(String) },
    );
  }
  record.sheet.events = [
    {
      id: id(401),
      side: "us",
      cap: 2,
      playerId: id(2),
      kind: "goal",
      period: 1,
      keeper: null,
      deleted: false,
    },
  ];
  await openLocal(page, record);
  await page
    .getByRole("button", { name: "Toca aquí para empezar el cuarto 5", exact: true })
    .click();
  await page.getByRole("button", { name: "Elegir portero y empezar el cuarto 5" }).click();
  await page.getByRole("button", { name: /Jugador 1\b/ }).click();
  await expect(page.getByRole("button", { name: "Terminar cuarto", exact: true })).toBeEnabled();
  expect((await readLocal(page)).sheet.period).toBe(5);
  await expect(page.getByLabel(/Cuartos jugados:/)).toHaveCount(0);
  for (const team of ["Morvedre", "Rival"]) {
    await page.getByRole("button", { name: team, exact: true }).click();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: new RegExp(`${team}, gorro`) }),
    ).toHaveCount(14);
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  }
  await page.getByRole("button", { name: "Corregir jugadas" }).click();
  await page.getByRole("combobox", { name: "Cuarto de las jugadas" }).selectOption("1");
  await expect(
    page.getByRole("dialog").getByText("Jugador 2", { exact: true }).first(),
  ).toBeVisible();
  await capture(page, "history-previous-quarter");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel(/Cuartos jugados:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Terminar cuarto", exact: true })).toBeEnabled();
  expect((await readLocal(page)).sheet.events).toHaveLength(1);
  await capture(page, "fifth-quarter");
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
  const notice = page.getByRole("region", { name: "Avisos antes del cuarto 4" });
  await expect(notice.getByText("Deben descansar")).toHaveCount(2);
  await expect(notice.getByText("Deben jugar")).toHaveCount(2);
  await capture(page, "fourth-notice");
  await page.getByRole("button", { name: "Elegir jugadores del cuarto 4" }).click();
  await capture(page, "fourth-selection-own");
  for (const n of [1, 2, 3, 4, 5, 6, 7])
    await page.getByRole("button", { name: new RegExp(`^${n} Jugador ${n}\\b`) }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  await capture(page, "fourth-selection-rival");
  for (const n of [1, 2, 3, 4, 5, 6, 7])
    await page.getByRole("button", { name: new RegExp(`^${n}\\b`) }).click();
  await page.getByRole("button", { name: "Listo, empezar cuarto" }).click();
  await expect(page.getByRole("heading", { name: "Revisa la rotación" })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Avisos de Morvedre" })
      .getByText("Jugador 2", { exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /Rival · \d+/ }).click();
  await expect(page.getByRole("region", { name: "Avisos de Rival" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Avisos de Rival" }).getByText("Gorro 9", { exact: true }),
  ).toBeAttached();
  await expect(page.getByRole("button", { name: "Volver a revisar" })).toBeInViewport();
  await capture(page, "rotation-confirmation");
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

test("lectura con texto ampliado: acta y selección siguen utilizables", async ({ page }) => {
  const record = fixture();
  record.sheet.phase = "playing";
  record.sheet.participation!.opponentConfirmed = true;
  record.sheet.participation!.lineups = [
    { period: 1, side: "us", keeper: id(1), field: [2, 3, 4, 5, 6, 7].map(id) },
    { period: 1, side: "them", keeper: "1", field: [2, 3, 4, 5, 6, 7].map(String) },
  ];
  await page.setViewportSize({ width: 393, height: 852 });
  await openLocal(page, record);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.locator("[data-acta-board-player]").first()).toBeVisible();
  await page.evaluate(() => {
    const first = document.querySelector("[data-acta-board-player]")!;
    window.scrollTo(0, first.getBoundingClientRect().top + scrollY - 16);
  });
  await capture(page, "board-text-200");
  await page.getByRole("button", { name: "Corregir jugadas" }).click();
  await page.getByRole("button", { name: "Revisar participación", exact: true }).click();
  await capture(page, "participation-text-200");
  await page.getByRole("button", { name: "Corregir cuarto 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardar selección" })).toBeInViewport();
  await capture(page, "selection-text-200");
});

test("mantiene filas uniformes, nombres en una línea y avisos visibles a 320 px", async ({
  page,
}) => {
  const record = fixture();
  record.sheet.phase = "playing";
  record.sheet.period = 2;
  record.sheet.players[2].name = "Juan Pepe Luis";
  record.sheet.players[3].name = "Alejandro Molina Castro";
  record.sheet.players.reverse();
  record.sheet.participation!.opponentConfirmed = true;
  for (const period of [1, 2]) {
    const field = period === 1 ? [2, 3, 4, 5, 6, 7] : [3, 4, 5, 6, 7, 8];
    record.sheet.participation!.lineups.push(
      { period, side: "us", keeper: id(1), field: field.map(id) },
      { period, side: "them", keeper: "1", field: field.map(String) },
    );
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await openLocal(page, record);
  await capture(page, "board-320");
  const board = page.getByRole("region", { name: "Jugadores y estadísticas del partido" });
  expect(
    await board
      .locator("[data-acta-board-player]")
      .evaluateAll((buttons) => [...new Set(buttons.map((b) => b.getBoundingClientRect().height))]),
  ).toEqual([96]);
  await page.getByRole("button", { name: "Morvedre", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /Morvedre, gorro/ })).toHaveCount(7);
  await expect(dialog).not.toContainText("exclusionLimit");
  await expect(dialog.getByText("0/3 exp.").first()).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Corregir jugadas" }).click();
  await page.getByRole("button", { name: "Revisar participación" }).click();
  const table = page.getByRole("table", { name: "Participación de Morvedre" });
  await expect(table.getByRole("rowheader")).toHaveText(
    Array.from({ length: 14 }, (_, i) => String(i + 1)),
  );
  await capture(page, "review-320");
  await page.getByRole("button", { name: "Corregir cuarto 2" }).click();
  await page.getByRole("button", { name: "9 Jugador 9", exact: true }).click();
  await expect(page.getByRole("alert")).toBeInViewport();
  await expect(page.getByRole("button", { name: "Guardar selección" })).toBeInViewport();
  await capture(page, "selection-error-320");
  dialog = page.getByRole("dialog");
  expect(
    await dialog
      .locator("[data-name-measure]")
      .evaluateAll((nodes) => nodes.every((n) => getComputedStyle(n).whiteSpace === "nowrap")),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});

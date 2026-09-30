import { test, expect } from "@playwright/test";
import { fixture, id, openLocal, readLocal, capture } from "./helpers/acta";

test("concreta las plazas pendientes por equipo y ajusta el aviso a su contenido", async ({
  page,
}) => {
  const record = fixture();
  record.sheet.category = "benjamin";
  record.sheet.period = 2;
  record.sheet.phase = "break";
  record.sheet.participation!.opponentConfirmed = true;
  for (const period of [1, 2]) {
    record.sheet.participation!.lineups.push(
      { period, side: "us", keeper: id(1), field: [2, 3, 4, 5, 6].map(id) },
      { period, side: "them", keeper: "1", field: [2, 3, 4, 5, 6].map(String) },
    );
  }
  record.lineupDraft = {
    period: 3,
    mode: "start",
    step: "us",
    baseMutation: record.mutation,
    us: { keeper: id(1), field: [2, 3, 4, 5, 6].map(id) },
    them: { keeper: "13", field: [7, 8, 9, 10, 11].map(String) },
  };
  await openLocal(page, record);
  await page
    .getByRole("button", { name: "Toca aquí para empezar el cuarto 3", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  await page.getByRole("button", { name: "Listo, empezar cuarto" }).click();
  const dialog = page.getByRole("dialog", { name: "Revisa la rotación" });
  const own = dialog.getByRole("region", { name: "Avisos de Morvedre" });
  await expect(own.getByRole("heading", { name: "No todos podrán jugar" })).toBeVisible();
  await expect(own).toContainText(
    "Morvedre: Quedarían 7 jugadores de campo sin haber jugado y solo 5 plazas en el cuarto 4",
  );
  await expect(own).toContainText("6 jugadores habrían jugado los cuartos 1, 2 y 3");
  await expect(dialog.getByText("Faltan datos", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("region", { name: "Avisos de Rival" })).toHaveCount(0);
  const blank = await dialog
    .getByRole("region", { name: "Contenido de Revisa la rotación" })
    .evaluate((node) => {
      return (
        node.getBoundingClientRect().bottom - node.lastElementChild!.getBoundingClientRect().bottom
      );
    });
  expect(blank).toBeLessThanOrEqual(1);
  await expect(dialog.getByRole("button", { name: "Volver a revisar" })).toBeInViewport();
  await capture(page, "capacity-confirmation");
});

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
  await expect(page.getByRole("button", { name: "Elegir jugadores del cuarto 4" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toca aquí para empezar el cuarto 4", exact: true })
    .click();
  await capture(page, "fourth-selection-own");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.getByRole("button", { name: "Continuar con Rival" })).toBeInViewport();
  await page.getByRole("button", { name: "2 Jugador 2", exact: true }).scrollIntoViewIfNeeded();
  await capture(page, "fourth-selection-text-200");
  await page.addStyleTag({ content: "html { font-size: 100% !important; }" });

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
  const participation = page.getByRole("button", { name: "Revisar participación", exact: true });
  await expect(participation).toHaveText("Quién jugó");
  const control = await participation.boundingBox();
  const score = await page.locator("[data-acta-score]").boundingBox();
  expect(control).not.toBeNull();
  expect(score).not.toBeNull();
  expect(control!.height).toBeGreaterThanOrEqual(48);
  expect(control!.y + control!.height).toBeLessThanOrEqual(score!.y);
  await capture(page, "board-320");
  const board = page.getByRole("region", { name: "Jugadores y estadísticas del partido" });
  expect(
    await board
      .locator("[data-acta-board-player]")
      .evaluateAll((buttons) => [...new Set(buttons.map((b) => b.getBoundingClientRect().height))]),
  ).toEqual([80]);
  expect(
    await board.locator("[data-acta-board-player]").evaluateAll((cells) =>
      cells.flatMap((cell) => {
        const bounds = cell.getBoundingClientRect();
        return Array.from(cell.querySelectorAll("strong, span"))
          .filter(
            (element) =>
              element.childElementCount === 0 &&
              element.textContent?.trim() &&
              !element.closest(".sr-only") &&
              getComputedStyle(element).display !== "none",
          )
          .flatMap((element) => {
            const rect = element.getBoundingClientRect();
            return rect.bottom > bounds.bottom + 1 || rect.top < bounds.top - 1
              ? [element.textContent]
              : [];
          });
      }),
    ),
  ).toEqual([]);
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

test("ajusta paneles reducidos, guía la selección y conserva las listas normales", async ({
  page,
}) => {
  const record = fixture();
  record.sheet.category = "escuela";
  await openLocal(page, record);
  await expect(page.getByRole("heading", { name: "Antes del primer balón" })).toBeVisible();
  await capture(page, "preparation-card");
  await page.getByRole("button", { name: "Empezar partido", exact: true }).click();
  let dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((node) => node.getBoundingClientRect().height)).toBeLessThan(600);
  await capture(page, "opponent-registration-fit");
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Morvedre: elige un portero (1 o 13) y 5 jugadores de campo más.",
  );
  for (const n of [1, 2, 3, 4, 5])
    await page.getByRole("button", { name: `${n} Jugador ${n}`, exact: true }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  await expect(page.getByRole("alert")).toContainText("falta 1 jugador de campo");
  await page.getByRole("button", { name: "6 Jugador 6", exact: true }).click();
  await page.getByRole("button", { name: "Continuar con Rival" }).click();
  for (const n of [1, 2, 3, 4, 5, 6])
    await page.getByRole("button", { name: String(n), exact: true }).click();
  await capture(page, "rival-selection-compact");
  await page.getByRole("button", { name: "Listo, empezar cuarto" }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator("[data-acta-meta]")).toHaveCSS("white-space", "nowrap");
  expect(
    await page.locator("[data-acta-meta]").evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(40);
  await page.getByRole("button", { name: "Morvedre", exact: true }).click();
  dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((node) => node.getBoundingClientRect().height)).toBeLessThan(600);
  await capture(page, "own-reduced-fit");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Rival", exact: true }).click();
  expect(
    await page.getByRole("dialog").evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(600);
  await capture(page, "rival-reduced-fit");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: /Morvedre, gorro 2, Jugador 2/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  await capture(page, "assist-reduced-fit");
  expect(
    await page.getByRole("dialog").evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(681);
  await page.getByRole("button", { name: "Gol sin asistencia", exact: true }).click();
  await page.getByRole("button", { name: /Rival, gorro 5,/ }).click();
  await page.getByRole("button", { name: "Penalti", exact: true }).click();
  await capture(page, "penalty-reduced-fit");
  expect(
    await page.getByRole("dialog").evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(681);
  await page.getByRole("button", { name: /Jugador 2/ }).click();
  await page.getByRole("button", { name: "Parada por el portero", exact: true }).click();
  await page.getByRole("button", { name: "Terminar cuarto", exact: true }).click();
  await page.getByRole("button", { name: "Sí, terminar cuarto 1", exact: true }).click();
  await expect(page.locator("[data-acta-keeper-control]")).toBeDisabled();
  await page
    .getByRole("button", { name: "Toca aquí para empezar el cuarto 2", exact: true })
    .click();
  const unselected = page.getByRole("button", { name: "2 Jugador 2", exact: true });
  const marks = unselected.locator("[data-acta-quarter-marks]");
  await expect(marks).toHaveText("1");
  await expect(marks.locator("svg")).toHaveCount(1);
  await unselected.click();
  await expect(marks).toHaveText("12");
  await expect(marks.locator("span").last()).toHaveCSS("background-color", "rgb(22, 87, 168)");
  await capture(page, "selection-current-past-rest");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  const normal = fixture();
  normal.sheet.category = "cadete";
  normal.sheet.participation = undefined;
  normal.sheet.phase = "playing";
  await openLocal(page, normal);
  await page.getByRole("button", { name: "Morvedre", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Morvedre, gorro/ }),
  ).toHaveCount(14);
  expect(
    await page.getByRole("dialog").evaluate((node) => node.getBoundingClientRect().height),
  ).toBeCloseTo(740 * 0.88, 0);
  await capture(page, "normal-list-preserved");
});

test("la convocatoria comparte la carga del acta y conserva el destino de vuelta", async ({
  page,
}) => {
  const record = fixture();
  record.sheet.phase = "playing";
  record.callupCandidates = record.sheet.players.map((player) => ({
    player_id: player.id,
    full_name: player.name,
    cap_number: player.cap,
    is_current_team: true,
    has_conflict: false,
  }));
  await openLocal(page, record);
  await expect(page.getByRole("button", { name: "Morvedre", exact: true })).toBeVisible();
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    const handler = Object.getOwnPropertyDescriptor(IDBRequest.prototype, "onsuccess")!;
    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory["open"]>) {
      const request = original.apply(this, args);
      Object.defineProperty(request, "onsuccess", {
        configurable: true,
        get() {
          return handler.get!.call(request);
        },
        set(listener) {
          handler.set!.call(request, (event: Event) =>
            setTimeout(() => listener?.call(request, event), 5000),
          );
        },
      });
      return request;
    };
  });
  await page.goto(`/acta/convocatoria?match=${record.matchId}&from=match`);
  await expect(page.getByRole("heading", { name: "Preparando la convocatoria…" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver al partido", exact: true })).toHaveAttribute(
    "href",
    `/matches/${record.matchId}`,
  );
  await capture(page, "callup-loading-shared");
  await expect(page.getByRole("heading", { name: "Convocatoria", exact: true })).toBeVisible({
    timeout: 15000,
  });
});

test("ajusta también la lista reducida de sustitutos después de una sanción", async ({ page }) => {
  const record = fixture();
  record.sheet.phase = "playing";
  record.sheet.participation!.opponentConfirmed = true;
  record.sheet.participation!.lineups = [
    { period: 1, side: "us", keeper: id(1), field: [2, 3, 4, 5, 6, 7].map(id) },
    { period: 1, side: "them", keeper: "1", field: [2, 3, 4, 5, 6, 7].map(String) },
  ];
  record.sheet.events = [401, 402, 403].map((number) => ({
    id: id(number),
    side: "us",
    cap: 2,
    playerId: id(2),
    kind: "exclusion",
    period: 1,
    keeper: null,
    deleted: false,
  }));
  await openLocal(page, record);
  await expect(page.getByRole("heading", { name: "Elige quién entra", exact: true })).toBeVisible();
  expect(
    await page.getByRole("dialog").evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(650);
  await capture(page, "substitute-reduced-fit");
  await page.getByRole("button", { name: "8 Jugador 8", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar sustitución", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await readLocal(page)).sheet.participation!.changes).toContainEqual(
    expect.objectContaining({ incoming: id(8), outgoing: id(2) }),
  );
});

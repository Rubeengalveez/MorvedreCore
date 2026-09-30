import { test, expect } from "@playwright/test";
import { fixture, id, openLocal, readLocal, capture } from "./helpers/acta";

function normal() {
  const record = fixture();
  record.team = "Cadete · Prueba local";
  record.sheet.category = "cadete";
  record.sheet.participation = undefined;
  record.sheet.periods = 4;
  record.sheet.phase = "playing";
  return record;
}

test("dos pestañas conservan el acta y entregan el control sin pisar jugadas", async ({
  page,
  context,
}) => {
  const record = normal();
  await openLocal(page, record);
  await expect(page.getByRole("button", { name: "Morvedre", exact: true })).toBeEnabled();
  const second = await context.newPage();
  await second.addInitScript(() =>
    Object.defineProperty(navigator, "onLine", { get: () => false }),
  );
  await second.goto(`/acta?match=${record.matchId}`);
  await expect(second.getByText("Preparando tu acta…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Morvedre, gorro 2,/ }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  await page.getByRole("button", { name: "Gol sin asistencia", exact: true }).click();
  expect((await readLocal(page)).sheet.events).toHaveLength(1);
  await page.close();
  await expect(second.getByRole("button", { name: /Morvedre, gorro 2,.*1 goles/ })).toBeVisible();
  await second.getByRole("button", { name: /Morvedre, gorro 3,/ }).click();
  await second.getByRole("button", { name: "Gol", exact: true }).click();
  await second.getByRole("button", { name: "Gol normal", exact: true }).click();
  await second.getByRole("button", { name: "Gol sin asistencia", exact: true }).click();
  expect((await readLocal(second)).sheet.events).toHaveLength(2);
});

test("juego habitual, penalti, entrenador y corrección de un cuarto anterior", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 740 });
  await openLocal(page, normal());
  await capture(page, "standard-board-320");
  await page.getByRole("button", { name: "Morvedre", exact: true }).click();
  await capture(page, "standard-player-selector-320");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Morvedre, gorro 2,/ })
    .click();
  await capture(page, "standard-actions-320");
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await capture(page, "goal-options-320");
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  await capture(page, "assist-options-320");
  await page.getByRole("button", { name: /Jugador 3 Elegir asistente/ }).click();
  expect((await readLocal(page)).sheet.events.map((event) => event.kind)).toEqual([
    "goal",
    "assist",
  ]);
  await page.getByRole("button", { name: /Morvedre, gorro 4,/ }).click();
  await page.getByRole("button", { name: "Tiro", exact: true }).click();
  await capture(page, "shot-options-320");
  await page.getByRole("button", { name: "Parada del portero rival", exact: true }).click();
  await page.getByRole("button", { name: /Rival, gorro 5,/ }).click();
  await page.getByRole("button", { name: "Penalti", exact: true }).click();
  await capture(page, "penalty-shooter-320");
  await page.getByRole("button", { name: /Jugador 2/ }).click();
  await capture(page, "penalty-result-320");
  await page.getByRole("button", { name: "Parada por el portero", exact: true }).click();
  await page.getByRole("button", { name: /^Entrenador:/ }).click();
  await capture(page, "coach-options-320");
  await page.getByRole("button", { name: "Tiempo muerto", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Morvedre/ })
    .click();
  await page.getByRole("button", { name: "Terminar cuarto", exact: true }).click();
  await capture(page, "end-quarter-320");
  await page.getByRole("button", { name: "Sí, terminar cuarto 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Toca aquí para empezar el cuarto 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Elegir portero y empezar el cuarto 2" }).click();
  await capture(page, "keeper-selector-320");
  await page.getByRole("button", { name: /Jugador 13/ }).click();
  expect((await readLocal(page)).sheet).toMatchObject({ period: 2, phase: "playing", keeper: 13 });
  await page.getByRole("button", { name: "Corregir jugadas" }).click();
  await page.getByRole("combobox", { name: "Cuarto de las jugadas" }).selectOption("1");
  await page.getByRole("button", { name: /Jugadas de Morvedre/ }).click();
  await capture(page, "correction-list-320");
  const goal = page.getByRole("listitem").filter({ hasText: "Gol normal" });
  await goal.getByRole("button", { name: "Anular", exact: true }).click();
  await capture(page, "annul-goal-320");
  await page.getByRole("button", { name: "Sí, anular esta jugada", exact: true }).click();
  const after = (await readLocal(page)).sheet;
  expect(
    after.events.filter((event) => !event.deleted && ["goal", "assist"].includes(event.kind)),
  ).toHaveLength(0);
  expect(after.events.filter((event) => !event.deleted).map((event) => event.kind)).toEqual([
    "shot_blocked",
    "penalty",
    "penalty_missed",
    "timeout",
  ]);
  expect(errors).toEqual([]);
});

test("convocatoria: sin gorro temporal, intercambio, sustitución y guardado sin perder jugadas", async ({
  page,
}) => {
  const record = normal();
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
  record.callupCandidates = Array.from({ length: 24 }, (_, i) => ({
    player_id: id(i + 1),
    cap_number: i < 14 ? i + 1 : null,
    full_name: `Jugador ${i + 1}`,
    has_conflict: false,
    is_current_team: true,
  }));
  record.callupTemplate = record.sheet.players.map((player) => ({
    player_id: player.id,
    cap_number: player.cap,
  }));
  await openLocal(page, record);
  await page.goto(`/acta/convocatoria?match=${record.matchId}&from=match`);
  await capture(page, "callup-editor");
  await page.getByRole("button", { name: /Gorro de Jugador 3: 3/ }).click();
  await page.getByRole("button", { name: "Dejar sin gorro", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardar convocatoria", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Gorro de Jugador 3: sin asignar/i }).click();
  await page.getByRole("button", { name: "Intercambiar con el gorro 4" }).click();
  await capture(page, "cap-swap-confirmation");
  await page.getByRole("button", { name: "Intercambiar gorros", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Gorro de Jugador 4: sin asignar/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Gorro de Jugador 4: sin asignar/i }).click();
  await page.getByRole("button", { name: "Asignar gorro 3", exact: true }).click();
  await page
    .getByRole("button", { name: "Reemplazar a Jugador 2 y conservar sus jugadas" })
    .click();
  await capture(page, "replacement-picker");
  await page.getByRole("button", { name: "Ver más jugadores", exact: true }).click();
  await page.getByRole("button", { name: "Elegir a Jugador 15 para recibir las jugadas" }).click();
  await capture(page, "replacement-confirmation");
  await page.getByRole("button", { name: "Sí, pasar jugadas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Volver a la convocatoria por defecto", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Volver al partido", exact: true }).click();
  await capture(page, "callup-unsaved-exit");
  await page.getByRole("button", { name: "Guardar y volver", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/matches/${record.matchId}`));
  const saved = await readLocal(page);
  expect(saved.dirty).toBe(true);
  expect(saved.rosterEdit).toBe(true);
  expect(saved.sheet.players.find((player) => player.id === id(15))).toMatchObject({ cap: 2 });
  expect(saved.sheet.events[0]).toMatchObject({ playerId: id(15), kind: "goal", cap: 2 });
  expect(saved.sheet.players.filter((player) => !player.retired)).toHaveLength(14);
});

test("tanda: varios turnos, deshacer, recuperación sin conexión y descarga de PDF", async ({
  page,
  context,
}) => {
  const record = normal();
  record.sheet.period = 4;
  record.sheet.phase = "shootout";
  record.sheet.shootout = { firstSide: "us", shots: [] };
  await openLocal(page, record);
  await capture(page, "shootout-launcher");
  await page.getByRole("button", { name: "2 Jugador 2", exact: true }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "2 Gorro 2", exact: true }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "3 Jugador 3", exact: true }).click();
  await page.getByRole("button", { name: "Fallado", exact: true }).click();
  await capture(page, "shootout-result");
  await page.getByRole("button", { name: "Parada del portero", exact: true }).click();
  expect((await readLocal(page)).sheet.shootout!.shots).toHaveLength(3);
  await page.getByRole("button", { name: "Deshacer último penalti", exact: true }).click();
  expect((await readLocal(page)).sheet.shootout!.shots).toHaveLength(2);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  expect((await readLocal(page)).sheet.shootout!.shots).toHaveLength(2);
  await page.getByRole("button", { name: "3 Jugador 3", exact: true }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  for (const [cap, own] of [
    [3, false],
    [4, true],
    [4, false],
  ] as const) {
    await page
      .getByRole("button", {
        name: own ? `${cap} Jugador ${cap}` : `${cap} Gorro ${cap}`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: own ? "Gol" : "Fallado", exact: true }).click();
    if (!own) await page.getByRole("button", { name: "Fuera / palo", exact: true }).click();
  }
  await page.getByRole("button", { name: "5 Jugador 5", exact: true }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Terminar partido", exact: true }).click();
  await page.getByRole("button", { name: "Compartir acta", exact: true }).click();
  await capture(page, "share-provisional-pdf");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF del acta", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});

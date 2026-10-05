import { test, expect } from "@playwright/test";
import { fixture, id, openLocal, readLocal, capture } from "./helpers/acta";
import { actaAnalysis } from "../../lib/domain/acta-analysis";
import { sheetSchema } from "../../lib/domain/live-match";

test("superioridad rival: cuatro acciones, normal o 1+, portero y corrección sin conexión", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const record = fixture();
  record.sheet.category = "absoluto";
  record.sheet.participation = undefined;
  record.sheet.periods = 4;
  record.sheet.phase = "playing";
  record.sheet.events = [2, 3].map((cap) => ({
    id: id(400 + cap),
    side: "us",
    cap,
    playerId: id(cap),
    kind: "exclusion",
    period: 1,
    keeper: null,
    deleted: false,
  }));
  expect(sheetSchema.safeParse(record.sheet).success).toBe(true);
  await openLocal(page, record);
  await page.getByRole("button", { name: /Rival, gorro 4,/ }).click();
  for (const name of ["Gol", "Expulsión", "Penalti", "Tarjeta roja"])
    await expect(page.getByRole("dialog").getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await expect(page.getByRole("button", { name: "Gol de contraataque", exact: true })).toHaveCount(
    0,
  );
  await capture(page, "rival-superiority-options-320");
  await page.getByRole("button", { name: "Gol en superioridad · 1+", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const current = (await readLocal(page)).sheet;
  expect(sheetSchema.safeParse(current).success).toBe(true);
  expect(current.events.at(-1)).toMatchObject({
    kind: "goal_extra",
    side: "them",
    cap: 4,
    keeper: 1,
  });
  expect(current.pending).toBeNull();
  expect(actaAnalysis(current)).toMatchObject({
    rivalExtraGoals: 1,
    rivalExtraOpportunities: 2,
    rivalExtraRate: 50,
    goalsThem: 1,
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Corregir jugadas" }).click();
  await page.getByRole("button", { name: /Jugadas de Rival/ }).click();
  const goal = page.getByRole("listitem").filter({ hasText: "Gol en superioridad · 1+" });
  await goal.getByRole("button", { name: "Corregir", exact: true }).click();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await page.getByRole("button", { name: "Gol normal", exact: true }).click();
  expect(actaAnalysis((await readLocal(page)).sheet)).toMatchObject({
    rivalExtraGoals: 0,
    rivalExtraOpportunities: 2,
    rivalExtraRate: 0,
    goalsThem: 1,
  });
});

test("feedback: contra con asistencia, tiro bloqueado, defensa y cupos a 320px sin conexión", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  const record = fixture();
  record.sheet.category = "absoluto";
  record.sheet.participation = undefined;
  record.sheet.periods = 4;
  record.sheet.phase = "playing";
  await openLocal(page, record);
  const player = async () => {
    await page.getByRole("button", { name: "Morvedre", exact: true }).click();
    await page.getByRole("button", { name: /Jugador 2/ }).click();
  };
  await player();
  await page.getByRole("button", { name: "Gol", exact: true }).click();
  await expect(page.getByRole("button", { name: "Gol de penalti", exact: true })).toHaveCount(0);
  await capture(page, "feedback-goal-320");
  await page.getByRole("button", { name: "Gol de contraataque", exact: true }).click();
  await page.getByRole("button", { name: /Jugador 3/ }).click();
  await player();
  await page.getByRole("button", { name: "Tiro", exact: true }).click();
  await capture(page, "feedback-shots-320");
  await page.getByRole("button", { name: "Tiro bloqueado", exact: true }).click();
  await player();
  await page.getByRole("button", { name: /Otras acciones/ }).click();
  await capture(page, "feedback-defense-320");
  await page.getByRole("button", { name: "Bloqueo defensivo", exact: true }).click();
  for (let count = 0; count < 2; count++) {
    if (count) await page.clock.fastForward(900);
    await page.getByRole("button", { name: /^Entrenador:/ }).click();
    await page.getByRole("button", { name: "Tiempo muerto", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Morvedre/ })
      .click();
    await page
      .getByRole("button", { name: "Registrar tiempo muerto concedido", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: /^Entrenador:/ })).toHaveAttribute(
    "aria-label",
    /Morvedre 2 de 2 usados, 0 disponibles/,
  );
  await capture(page, "feedback-timeouts-exhausted-320");
  await page.getByRole("button", { name: /^Entrenador:/ }).click();
  await page.getByRole("button", { name: "Tiempo muerto", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Morvedre/ })
    .click();
  await expect(page.getByRole("alert")).toContainText("No puedes registrar otro");
  await capture(page, "feedback-timeout-warning-320");
  await page.getByRole("dialog").getByRole("button", { name: /Rival/ }).click();
  await page
    .getByRole("button", { name: "Registrar tiempo muerto concedido", exact: true })
    .click();
  const sheet = (await readLocal(page)).sheet;
  expect(sheet.events.filter((e) => e.kind === "timeout" && e.side === "us")).toHaveLength(2);
  expect(sheet.events.filter((e) => e.kind === "timeout" && e.side === "them")).toHaveLength(1);
  expect(sheet.events.filter((e) => e.kind === "assist")[0].related_event_id).toBe(
    sheet.events[0].id,
  );
  expect(sheet.events.map((e) => e.kind).slice(0, 4)).toEqual([
    "goal_counter",
    "assist",
    "shot_deflected",
    "defensive_block",
  ]);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Entrenador:/ })).toHaveAttribute(
    "aria-label",
    /Morvedre 2 de 2 usados, 0 disponibles/,
  );
});

test("intercambio rápido: confirma gorros, conserva participación y persiste al recargar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const record = fixture();
  record.sheet.phase = "playing";
  record.sheet.participation!.opponentConfirmed = true;
  record.sheet.participation!.lineups = ["us", "them"].map((side) => ({
    period: 1,
    side: side as "us" | "them",
    keeper: side === "us" ? id(1) : "1",
    field: [2, 3, 4, 5, 6, 7].map((cap) => (side === "us" ? id(cap) : String(cap))),
  }));
  await openLocal(page, record);
  await page.getByRole("button", { name: "Morvedre", exact: true }).click();
  await page.getByRole("button", { name: /Jugador 1,/ }).click();
  await page.getByRole("button", { name: "Cambiar gorro con un jugador", exact: true }).click();
  await capture(page, "feedback-keeper-swap-320");
  const swap = page.getByRole("dialog").filter({ hasText: "Cambiar gorro con un jugador" });
  await expect(swap.getByRole("button", { name: /Gorro 8/ })).toHaveCount(0);
  await swap.getByRole("button", { name: "Gorro 2 · Jugador 2", exact: true }).click();
  await capture(page, "feedback-keeper-confirm-320");
  await page.getByRole("button", { name: "Confirmar intercambio", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const sheet = (await readLocal(page)).sheet;
  expect(sheet.players.find((p) => p.id === id(2))?.cap).toBe(1);
  expect(sheet.players.find((p) => p.id === id(1))?.cap).toBe(2);
  expect(sheet.participation!.lineups[0].field).toContain(id(2));
  expect(sheet.keeperStints?.at(-1)?.playerId).toBe(id(2));
  await page.reload();
  await page.getByRole("button", { name: "Morvedre", exact: true }).click();
  await expect(page.getByRole("button", { name: /Jugador 2,/ })).toHaveAttribute(
    "aria-label",
    /gorro 1/,
  );
});

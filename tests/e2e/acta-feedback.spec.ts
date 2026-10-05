import { test, expect } from "@playwright/test";
import { fixture, id, openLocal, readLocal, capture } from "./helpers/acta";
import { actaAnalysis } from "../../lib/domain/acta-analysis";
import { sheetSchema } from "../../lib/domain/live-match";

test("superioridad rival: cuadrícula, roja aparte, portero y corrección sin conexión", async ({
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
  for (const name of ["Gol", "Gol en superioridad · 1+", "Expulsión", "Penalti", "Tarjeta roja"])
    await expect(page.getByRole("dialog").getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gol de contraataque", exact: true })).toHaveCount(
    0,
  );
  await capture(page, "rival-superiority-options-320");
  const goalLabel = await page
    .getByRole("button", { name: "Gol en superioridad · 1+", exact: true })
    .evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        text: element.textContent,
        lines: range.getClientRects().length,
        scroll: element.scrollWidth,
        width: element.clientWidth,
      };
    });
  expect(goalLabel.text).toBe("Gol 1+");
  expect(goalLabel.lines).toBe(1);
  expect(goalLabel.scroll).toBeLessThanOrEqual(goalLabel.width);
  const positions = await Promise.all(
    ["Gol", "Gol en superioridad · 1+", "Penalti", "Expulsión", "Tarjeta roja"].map((name) =>
      page.getByRole("button", { name, exact: true }).evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width };
      }),
    ),
  );
  expect(positions[0].y).toBe(positions[1].y);
  expect(positions[2].y).toBe(positions[3].y);
  expect(positions[0].x).toBe(positions[2].x);
  expect(positions[1].x).toBe(positions[3].x);
  expect(positions[4].y).toBeGreaterThan(positions[3].y);
  expect(positions[4].width).toBeGreaterThan(positions[0].width * 2);
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
  expect(actaAnalysis((await readLocal(page)).sheet)).toMatchObject({
    rivalExtraGoals: 0,
    rivalExtraOpportunities: 2,
    rivalExtraRate: 0,
    goalsThem: 1,
  });
});

for (const category of ["benjamin", "alevin", "infantil"] as const) {
  test(`${category}: un aviso legible, sin solicitud de tiempo muerto y con tarjetas`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const record = fixture();
    record.sheet.category = category;
    record.sheet.participation = undefined;
    record.sheet.phase = "playing";
    await openLocal(page, record);
    await page.getByRole("button", { name: /^Entrenador:/ }).click();
    await expect(page.getByRole("button", { name: "Tiempo muerto", exact: true })).toHaveCount(0);
    await expect(page.getByRole("note")).toHaveCount(1);
    await expect(page.getByRole("note")).toContainText("Tiempos muertos no permitidos");
    await capture(page, `${category}-no-timeouts-320`);
    const colors = await page.getByRole("note").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        foreground: style.color,
        background: style.backgroundColor,
        border: style.borderTopColor,
        borderWidth: style.borderTopWidth,
      };
    });
    expect(colors).toEqual({
      foreground: "rgb(6, 32, 72)",
      background: "rgb(232, 241, 252)",
      border: "rgb(6, 32, 72)",
      borderWidth: "2px",
    });
    await page.getByRole("button", { name: "Tarjeta al entrenador", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Rival", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Roja al entrenador", exact: true }),
    ).toBeVisible();
    expect((await readLocal(page)).sheet.events).toHaveLength(0);
  });
}

for (const period of [5, 6]) {
  test(`cuarto ${period}: intercambio desde Portero en juego ofrece convocados y se puede cancelar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const record = fixture();
    record.sheet.period = period;
    record.sheet.phase = "playing";
    record.sheet.participation!.opponentConfirmed = true;
    record.sheet.participation!.lineups = ["us", "them"].map((side) => ({
      period: 1,
      side: side as "us" | "them",
      keeper: side === "us" ? id(1) : "1",
      field: [2, 3, 4, 5, 6, 7].map((cap) => (side === "us" ? id(cap) : String(cap))),
    }));
    await openLocal(page, record);
    await page.getByRole("button", { name: /Portero en juego,/ }).click();
    await capture(page, `keeper-quarter-${period}-320`);
    await page.getByRole("button", { name: "Cambiar gorro con un jugador", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Gorro 8 · Jugador 8", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Gorro 8 · Jugador 8", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Jugador 8 pasa de gorro 8 a 1 y será portero",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    expect((await readLocal(page)).sheet.players.find((player) => player.id === id(8))?.cap).toBe(
      8,
    );
    expect((await readLocal(page)).sheet.keeper).toBe(1);
  });
}

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
  const warningBorder = await page.getByRole("alert").evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.borderTopColor, width: style.borderTopWidth };
  });
  expect(warningBorder).toEqual({ color: "rgb(6, 32, 72)", width: "2px" });
  await capture(page, "feedback-timeout-warning-320");
  const timeoutColors = await page
    .getByRole("dialog")
    .getByRole("button", { name: /Morvedre/ })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      const exhausted = [...element.querySelectorAll("strong")].find(
        (item) => item.textContent === "SIN TIEMPOS",
      )!;
      return {
        background: style.backgroundColor,
        text: style.color,
        exhausted: getComputedStyle(exhausted).color,
      };
    });
  expect(timeoutColors).toEqual({
    background: "rgb(22, 87, 168)",
    text: "rgb(255, 255, 255)",
    exhausted: "rgb(255, 255, 255)",
  });
  const rivalColors = await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rival/ })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, text: style.color };
    });
  expect(rivalColors).toEqual({ background: "rgb(244, 196, 48)", text: "rgb(6, 32, 72)" });
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
  await page.getByRole("button", { name: /Portero en juego,/ }).click();
  await capture(page, "feedback-keeper-review-320");
  await page.getByRole("button", { name: "Cambiar gorro con un jugador", exact: true }).click();
  await capture(page, "feedback-keeper-swap-320");
  const swap = page.getByRole("dialog").filter({ hasText: "Cambiar gorro con un jugador" });
  await expect(swap.getByRole("button", { name: /Gorro 8/ })).toBeVisible();
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

test("ajustes visuales: avisos, tarjetas y cambio con un convocado del banquillo", async ({
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
  await page.getByRole("button", { name: /^Entrenador:/ }).click();
  const cards = page.getByRole("button", { name: "Tarjeta al entrenador", exact: true });
  const notice = page.getByRole("note").filter({ hasText: "Tiempos muertos no permitidos" });
  const noticeBox = (await notice.boundingBox())!;
  const cardBox = (await cards.boundingBox())!;
  expect(Math.abs(noticeBox.height - cardBox.height)).toBeLessThanOrEqual(1);
  expect(noticeBox.width).toBe(cardBox.width);
  await expect(notice).toHaveCSS("text-align", "center");
  await expect(notice).toHaveCSS("font-size", "17px");
  await capture(page, "polish-timeouts-320");
  await cards.click();
  for (const name of ["Morvedre", "Rival"]) {
    const team = page.getByRole("dialog").getByRole("button", { name, exact: true });
    expect((await team.boundingBox())!.height).toBeGreaterThanOrEqual(70);
  }
  await capture(page, "polish-coach-cards-320");
  await page.getByRole("button", { name: /Cerrar/ }).click();
  await page.getByRole("button", { name: /Portero en juego,/ }).click();
  await page.getByRole("button", { name: "Cambiar gorro con un jugador", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Gorro / })).toHaveCount(13);
  await expect(page.getByRole("dialog")).not.toContainText("solo aparecen jugadores");
  await capture(page, "polish-keeper-list-320");
  await page.getByRole("button", { name: "Gorro 8 · Jugador 8", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("el anterior pasa al banquillo");
  await page.getByRole("button", { name: "Confirmar intercambio", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const next = (await readLocal(page)).sheet;
  expect(next.participation!.changes.at(-1)).toMatchObject({
    incoming: id(8),
    outgoing: id(1),
    reason: "keeper_swap",
  });
  expect(next.keeperStints!.at(-1)?.playerId).toBe(id(8));
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Portero de Morvedre, gorro 1, Jugador 8/ }),
  ).toBeVisible();
});

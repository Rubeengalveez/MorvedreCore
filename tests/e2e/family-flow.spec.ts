import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.FAMILY_DEMO_PASSWORD;
const screenshotDir = process.env.FAMILY_SCREENSHOT_DIR;
const familyMatchId = process.env.FAMILY_DEMO_MATCH_ID;

async function login(page: Page, email: string) {
  if (!password) throw new Error("Falta FAMILY_DEMO_PASSWORD.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
}

test.describe("Experiencia familiar", () => {
  test.describe.configure({ timeout: 90_000 });
  test.skip(!password, "Credenciales de familia demo no configuradas.");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("el tutor gestiona dos hijos sin cambiar de perfil", async ({ page }) => {
    await login(page, "familia.demo@morvedre-core.test");
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "Tu familia" })).toBeVisible();
    await expect(page.getByText("Lucía Torres Demo", { exact: true })).toBeVisible();
    await expect(page.getByText("Mateo Torres Demo", { exact: true })).toBeVisible();
    await expect(page.getByText("2 menores a tu cargo")).toBeVisible();
    await expect(page.getByText("Lucía y Mateo", { exact: true })).toBeVisible();
    await expect(page.getByText("Cuotas y pagos").first()).toBeVisible();
    await expect(page.getByText("Perfil activo")).toHaveCount(0);

    if (screenshotDir) {
      mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({
        path: resolve(screenshotDir, "familia-tutor-movil.png"),
        fullPage: true,
      });
    }

    await page.goto("/calendar");
    const familyTeamFilter = page.getByRole("combobox");
    await expect(familyTeamFilter.getByRole("option", { name: /Benjamín · Lucía/i })).toHaveCount(
      1,
    );
    await expect(familyTeamFilter.getByRole("option", { name: /Infantil · Mateo/i })).toHaveCount(
      1,
    );

    await page.goto("/shop/parents/pending", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Compras por revisar" })).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Lucía Torres Demo" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprobar" })).toBeVisible();
  });

  test("el menor ve su pedido pero nunca sus importes", async ({ page }) => {
    await login(page, "lucia.demo@morvedre-core.test");
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "Lucía Torres Demo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tu familia" })).toHaveCount(0);
    await expect(page.getByText("Cuotas y pagos")).toHaveCount(0);

    await page.goto("/treasury");
    await page.waitForURL(/\/profile(?:\?|$)/);
    await page.goto("/shop/orders");
    await expect(page.getByText("Pendiente de familia").first()).toBeVisible();

    if (screenshotDir) {
      mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({
        path: resolve(screenshotDir, "familia-hija-pedido.png"),
        fullPage: true,
      });
    }
  });

  test("el tutor responde una convocatoria sin suplantar al hijo", async ({ page }) => {
    test.skip(!familyMatchId, "Partido de familia demo no configurado.");
    await login(page, "familia.demo@morvedre-core.test");
    await page.goto(`/matches/${familyMatchId}`);

    await expect(page.getByRole("heading", { name: "Asistencia de tu familia" })).toBeVisible();
    await expect(page.getByText("Lucía Torres Demo", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Confirmar asistencia" }).click();
    await expect(page.getByRole("button", { name: "Asistiré" })).toBeVisible({ timeout: 15_000 });

    if (screenshotDir) {
      mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({
        path: resolve(screenshotDir, "familia-tutor-convocatoria.png"),
        fullPage: true,
      });
    }
  });
});

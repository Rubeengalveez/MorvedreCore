import { expect, test, type Page } from "@playwright/test";

const password = process.env.CLUB_DEMO_PASSWORD;

async function login(page: Page, email: string) {
  if (!password) throw new Error("Falta CLUB_DEMO_PASSWORD.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
}

test.describe("Accesos por rol para la demo", () => {
  test.skip(!password, "Credenciales de demo no configuradas.");

  test("administración abre el centro de mando", async ({ page }) => {
    await login(page, "admin.demo@morvedre-core.test");
    await page.goto("/admin");
    await expect(page.getByText("Centro de mando")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Administración");
  });

  test("entrenador abre la gestión de entrenamientos", async ({ page }) => {
    await login(page, "vega.martinez@morvedre-core.test");
    await page.goto("/admin/trainings");
    await expect(page.getByRole("heading", { name: "Entrenamientos" })).toBeVisible();
  });

  test("tesorería abre el control económico", async ({ page }) => {
    await login(page, "monica.gil@morvedre-core.test");
    await page.goto("/admin/treasury");
    await expect(page.getByRole("heading", { name: "Tesoreria" })).toBeVisible();
  });

  test("tienda abre los pedidos del club", async ({ page }) => {
    await login(page, "sol.romero@morvedre-core.test");
    await page.goto("/admin/shop");
    await expect(page.getByRole("heading", { name: "Pedidos del club" })).toBeVisible();
  });
});

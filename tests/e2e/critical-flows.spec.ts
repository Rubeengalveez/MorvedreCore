import { test, expect, type Page } from "@playwright/test";

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

async function loginAsAdmin(page: Page) {
  if (!TEST_ADMIN_EMAIL || !TEST_PASSWORD) {
    throw new Error("Faltan TEST_ADMIN_EMAIL y TEST_PASSWORD.");
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/(dashboard|change-password)(?:\?|$)/, { timeout: 10_000 });
  if (page.url().includes("change-password")) {
    throw new Error("La cuenta E2E requiere un cambio de contraseña manual antes de probarla.");
  }
}

test.describe("Morvedre Core critical flows", () => {
  test("login page renders with form and club identity", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Morvedre Core/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("login form uses a React server action", async ({ page }) => {
    await page.goto("/login");
    const formAction = await page.locator("form").first().getAttribute("action");
    expect(formAction).toMatch(/^javascript:/);
  });

  test("skip link is present", async ({ page }) => {
    await page.goto("/login");
    const skipLink = page.getByRole("link", { name: /saltar al contenido/i });
    await expect(skipLink).toBeAttached();
  });

  test("icon buttons have aria-labels on dashboard", async ({ page }) => {
    test.skip(!TEST_ADMIN_EMAIL || !TEST_PASSWORD, "Credenciales E2E no configuradas.");
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    const iconButtons = page.locator("button[aria-label]");
    const count = await iconButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("calendar shows legend and view mode tabs", async ({ page }) => {
    test.skip(!TEST_ADMIN_EMAIL || !TEST_PASSWORD, "Credenciales E2E no configuradas.");
    await loginAsAdmin(page);
    await page.goto("/calendar");
    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test("focus visible on primary button", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button", { name: /entrar/i });
    await btn.focus();
    const boxShadow = await btn.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(boxShadow).not.toBe("none");
  });
});

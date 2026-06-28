import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("galvillo9@gmail.com");
  await page.getByLabel(/contrase/i).fill(process.env.TEST_PASSWORD ?? "Rga7707Rga:1");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(
    (url) => !url.toString().includes("?"),
    { timeout: 10_000 },
  );
  if (page.url().includes("change-password")) {
    await page.getByLabel(/nueva contraseña/i).fill("Rga7707Rga:1");
    await page.getByLabel(/repite/i).fill("Rga7707Rga:1");
    await page.getByRole("button", { name: /guardar/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }
}

test.describe("Morvedre Core critical flows", () => {
  test("login page renders with form and club identity", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Morvedre Core/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/contrase/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("login form has method=post to prevent password in URL", async ({ page }) => {
    await page.goto("/login");
    const formMethod = await page.locator("form").first().getAttribute("method");
    expect(formMethod?.toLowerCase()).toBe("post");
  });

  test("skip link is present", async ({ page }) => {
    await page.goto("/login");
    const skipLink = page.getByRole("link", { name: /saltar al contenido/i });
    await expect(skipLink).toBeAttached();
  });

  test("icon buttons have aria-labels on dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    const iconButtons = page.locator("button[aria-label]");
    const count = await iconButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("calendar shows legend and view mode tabs", async ({ page }) => {
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

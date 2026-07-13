import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("login page is reachable and titled", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Morvedre/);
  });

  test("landing page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
    await expect(page).toHaveTitle(/Morvedre/);
  });
});

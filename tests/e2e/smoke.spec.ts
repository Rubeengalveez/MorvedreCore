import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("login page is reachable and titled", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Morvedre/);
  });

  test("landing page shows the app name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Morvedre Core" })).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Login form", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/Morvedre Core/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/contrase/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
    await expect(page.getByText(/waterpolo morvedre/i)).toBeVisible();
  });

  test("form has method=post to prevent password in URL", async ({ page }) => {
    await page.goto("/login");
    const formMethod = await page.locator("form").first().getAttribute("method");
    expect(formMethod?.toLowerCase()).toBe("post");
  });

  test("submitting form does NOT put password in URL", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel(/contrase/i).fill("testpassword123");

    const urlBefore = page.url();

    await page.getByRole("button", { name: /entrar/i }).click();

    await page.waitForTimeout(2000);

    const urlAfter = page.url();

    expect(urlAfter).not.toContain("password=");
    expect(urlAfter).not.toContain("email=");
    expect(urlAfter.split("?")[0]).toBe(urlBefore.split("?")[0]);
  });

  test("empty fields show validation errors", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel(/contrase/i).fill("");

    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page.getByText(/email v/i)).toBeVisible({ timeout: 3_000 });
  });
});

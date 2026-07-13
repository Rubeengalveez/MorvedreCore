import { test, expect } from "@playwright/test";

test.describe("Login form", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/Morvedre Core/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
    await expect(page.getByText(/waterpolo morvedre/i)).toBeVisible();
  });

  test("uses a React server action", async ({ page }) => {
    await page.goto("/login");
    const formAction = await page.locator("form").first().getAttribute("action");
    expect(formAction).toMatch(/^javascript:/);
  });

  test("submitting form does NOT put password in URL", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@test.com");
    await page.locator('input[name="password"]').fill("testpassword123");

    await Promise.all([
      page.waitForURL(/\/login\/request(?:\?|$)/),
      page.getByRole("button", { name: /entrar/i }).click(),
    ]);

    const url = new URL(page.url());
    expect(url.searchParams.has("password")).toBe(false);
    expect(url.href).not.toContain("testpassword123");
  });

  test("empty fields show validation errors", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("not-an-email");
    const password = page.locator('input[name="password"]');
    await password.fill("");

    await page.getByRole("button", { name: /entrar/i }).click();

    expect(
      await page
        .getByLabel("Email")
        .evaluate((input: HTMLInputElement) => input.validity.typeMismatch),
    ).toBe(true);
    expect(await password.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(
      true,
    );
  });
});

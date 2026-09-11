import { test, expect, devices } from "@playwright/test";

test.describe("Login form", () => {
  test.use({ ...devices["iPhone 13"] });

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

  test("mobile touch can reveal the password and submit the form", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@test.com");
    const password = page.locator('input[name="password"]');
    await password.fill("testpassword123");

    const reveal = page.getByRole("button", { name: "Mostrar contraseña" });
    const revealBox = await reveal.boundingBox();
    expect(revealBox).not.toBeNull();
    const revealHitTarget = await page.evaluate(
      ({ x, y }) => {
        const target = document.elementFromPoint(x, y);
        return {
          tag: target?.tagName,
          label: target?.closest("button")?.getAttribute("aria-label"),
        };
      },
      {
        x: revealBox!.x + revealBox!.width / 2,
        y: revealBox!.y + revealBox!.height / 2,
      },
    );
    expect(revealHitTarget).toEqual({ tag: "svg", label: "Mostrar contraseña" });
    await page.touchscreen.tap(
      revealBox!.x + revealBox!.width / 2,
      revealBox!.y + revealBox!.height / 2,
    );
    await expect(password).toHaveAttribute("type", "text");

    const submit = page.getByRole("button", { name: /entrar/i });
    const submitBox = await submit.boundingBox();
    expect(submitBox).not.toBeNull();
    await Promise.all([
      page.waitForURL(/\/login\/request(?:\?|$)/),
      page.touchscreen.tap(
        submitBox!.x + submitBox!.width / 2,
        submitBox!.y + submitBox!.height / 2,
      ),
    ]);
  });
});

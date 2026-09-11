import { chromium } from "@playwright/test";
import path from "path";
import { config } from "dotenv";
import { createDemoSession } from "./lib/demo-session.mjs";

config({ path: ".env.local", quiet: true });

const outDir = "C:/Users/galvi/.gemini/antigravity/brain/ff3dfa79-82b9-4ad8-b0af-17f161f03267";

async function main() {
  const session = await createDemoSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await context.addCookies(session.cookies);

  const page = await context.newPage();
  await page.goto("http://localhost:3000/acta?match=3adbcc4c-5f80-4588-b4fd-71e9a8f7a19e", { waitUntil: "networkidle" });
  await page.waitForSelector("[data-acta-board]", { timeout: 15000 });
  console.log("Board is visible!");

  await page.screenshot({ path: path.join(outDir, "screen-main-board.png") });
  console.log("Captured screen-main-board.png");

  // Check if there is Morvedre button in footer
  const morvedreBtn = page.locator('button:has-text("Morvedre")').last();
  if (await morvedreBtn.isVisible()) {
    await morvedreBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, "screen-morvedre-sheet.png") });
    console.log("Captured screen-morvedre-sheet.png");
  }

  // Close sheet
  const closeBtn = page.locator('button[aria-label="Cerrar panel"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // Click Rival button
  const rivalBtn = page.locator('button:has-text("Rival")').last();
  if (await rivalBtn.isVisible()) {
    await rivalBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, "screen-rival-sheet.png") });
    console.log("Captured screen-rival-sheet.png");
  }

  await browser.close();
  console.log("DONE");
}

main().catch(console.error);

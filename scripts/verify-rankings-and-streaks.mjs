import { chromium } from "@playwright/test";
import path from "path";
import { config } from "dotenv";
import { createDemoSession } from "./lib/demo-session.mjs";

config({ path: ".env.local", quiet: true });

const outDir = "C:/Users/galvi/.gemini/antigravity/brain/ec0d3ee6-ff9c-4a99-9932-ffc6f179a952";

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

  console.log("Navigating to /streaks...");
  await page.goto("http://localhost:3000/streaks", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "screen-streaks-selector.png") });
  console.log("Captured screen-streaks-selector.png");

  console.log("Navigating to /rankings?metric=swim...");
  await page.goto("http://localhost:3000/rankings?metric=swim", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "screen-swim-podium.png") });
  console.log("Captured screen-swim-podium.png");

  await browser.close();
  console.log("Verification finished successfully!");
}

main().catch(console.error);

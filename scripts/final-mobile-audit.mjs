import { chromium } from "@playwright/test";

const baseUrl = "http://localhost:3000";

const viewports = [
  { name: "iPhone SE 320", width: 320, height: 568 },
  { name: "Pixel 5 393", width: 393, height: 851 },
  { name: "iPhone 14 Pro Max 430", width: 430, height: 932 },
];

const pages = [
  { name: "Login", path: "/login" },
  { name: "Request Access", path: "/login/request" },
  { name: "Reset Password", path: "/reset-password" },
];

const browser = await chromium.launch({ headless: true });

for (const vp of viewports) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
  console.log("=".repeat(70));

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const p of pages) {
    try {
      await page.goto(`${baseUrl}${p.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const m = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
          docW: doc.scrollWidth,
          docH: doc.scrollHeight,
          cliW: doc.clientWidth,
          cliH: doc.clientHeight,
          bodyW: body.scrollWidth,
          hOverflow: doc.scrollWidth > doc.clientWidth + 1,
        };
      });
      const status = m.hOverflow ? "✗" : "✓";
      const tag = `screenshots/mobile-${vp.width}-${p.name}.png`;
      await page.screenshot({ path: tag, fullPage: true });
      console.log(`  ${status} ${p.name.padEnd(18)} ${p.path.padEnd(20)}  docW=${m.docW} cliW=${m.cliW} ${m.hOverflow ? "OVERFLOW!" : ""}`);
      console.log(`     → ${tag} (${m.docW}x${m.docH})`);
    } catch (e) {
      console.log(`  ✗ ${p.name}: ${e.message.slice(0, 60)}`);
    }
  }
  await context.close();
}

await browser.close();
console.log("\n✓ Captura completa");

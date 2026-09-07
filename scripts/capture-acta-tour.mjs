import { chromium } from '@playwright/test';
import { config } from 'dotenv';
import { createDemoSession } from './lib/demo-session.mjs';
config({ path: '.env.local', quiet: true });
async function run() {
  const session = await createDemoSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies(session.cookies);
  const page = await context.newPage();
  const url = 'http://localhost:3000/acta?match=d3a30000-0000-4000-8000-000000000007';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Preparando el partido'));
  await page.waitForTimeout(1000);
  const btn = page.locator('button', { hasText: /Activar este/ });
  if (await btn.isVisible()) {
    console.log('Clicking Activar este...');
    await btn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'tmp/acta-audit/tour_1_morvedre_board.png' });
  console.log('Saved tour_1_morvedre_board.png');

  const player2 = page.locator('button', { hasText: /Mateo Torres/ });
  await player2.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp/acta-audit/tour_2_player_actions.png' });
  console.log('Saved tour_2_player_actions.png');
  await page.getByRole('button', { name: 'Cerrar panel' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: /Rival/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp/acta-audit/tour_3_rival_tab.png' });
  console.log('Saved tour_3_rival_tab.png');

  const rivalCard = page.getByLabel(/Rival, gorro 9/).first();
  if (await rivalCard.isVisible()) {
    await rivalCard.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tmp/acta-audit/tour_4_rival_actions.png' });
    console.log('Saved tour_4_rival_actions.png');
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    await page.waitForTimeout(400);
  }

  await page.locator('button', { hasText: /Porter/i }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp/acta-audit/tour_5_keeper_tab.png' });
  console.log('Saved tour_5_keeper_tab.png');

  const finishBtn = page.locator('button', { hasText: /Finalizar Cuarto/ });
  if (await finishBtn.isVisible()) {
    await finishBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tmp/acta-audit/tour_6_finish_quarter_modal.png' });
    console.log('Saved tour_6_finish_quarter_modal.png');
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    await page.waitForTimeout(400);
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: /Morvedre/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp/acta-audit/tour_7_compact_320.png' });
  console.log('Saved tour_7_compact_320.png');

  await browser.close();
  await session.client.auth.signOut({ scope: 'local' });
  console.log('ALL_TOUR_SCREENSHOTS_COMPLETED');
}
run().catch(err => { console.error(err); process.exit(1); });
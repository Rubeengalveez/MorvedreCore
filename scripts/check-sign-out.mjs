import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { createDemoSession } from "./lib/demo-session.mjs";

config({ path: ".env.local", quiet: true });

const sessions = [];
let browser;
try {
  sessions.push(await createDemoSession());
  sessions.push(await createDemoSession());
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(sessions[0].cookies);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:3000/profile", { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/profile");
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.waitForURL("**/login", { timeout: 30000 });
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/login");
  const otherSession = await sessions[1].client.auth.refreshSession();
  assert.equal(
    otherSession.error,
    null,
    "La otra sesión debe poder renovarse tras el cierre local.",
  );
  const closedSession = await sessions[0].client.auth.refreshSession();
  assert.ok(closedSession.error, "La sesión cerrada no debe poder renovarse.");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      logout: "ok",
      privateRouteAfterLogout: "login",
      closedSessionRefresh: "rejected",
      otherSessionRefresh: "ok",
      pageErrors: 0,
    }),
  );
} finally {
  await browser?.close();
  await Promise.allSettled(sessions.map(({ client }) => client.auth.signOut({ scope: "local" })));
}

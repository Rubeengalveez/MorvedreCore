import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const baseUrl = "http://localhost:3000";
const outputDir = join(tmpdir(), "morvedre-current-ui-audit");
const captureScreenshots = process.argv.includes("--screenshots");
const focusMode = process.argv.includes("--focus");
const resultPath = join(outputDir, focusMode ? "results-focus.json" : "results.json");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Faltan variables de Supabase para la auditoría autenticada.");
}

await mkdir(outputDir, { recursive: true });

async function createAuthCookies() {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "admin.demo@morvedre-core.test",
  });
  if (linkError || !linkData.properties.hashed_token) {
    throw linkError ?? new Error("No se pudo generar la sesión de auditoría.");
  }

  const pendingCookies = [];
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookies) {
        pendingCookies.push(...cookies);
      },
    },
  });
  const { error: verifyError } = await authClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) throw verifyError;

  return pendingCookies.map(({ name, value, options }) => ({
    name,
    value,
    domain: "localhost",
    path: options?.path ?? "/",
    httpOnly: options?.httpOnly,
    sameSite:
      options?.sameSite === "strict" ? "Strict" : options?.sameSite === "none" ? "None" : "Lax",
    secure: false,
  }));
}

const routes = focusMode
  ? [
      ["admin-shop-new", "/admin/shop/products/new"],
      ["admin-treasury", "/admin/treasury"],
    ]
  : [
      ["dashboard", "/dashboard"],
      ["calendar", "/calendar"],
      ["rankings", "/rankings"],
      ["streaks", "/streaks"],
      ["legends", "/legends"],
      ["team", "/team"],
      ["news", "/news"],
      ["shop", "/shop"],
      ["shop-cart", "/shop/cart"],
      ["shop-orders", "/shop/orders"],
      ["shop-parent-orders", "/shop/parents/pending"],
      ["notifications", "/notifications"],
      ["profile", "/profile"],
      ["profile-edit", "/profile/edit"],
      ["attendance", "/attendance"],
      ["attendance-history", "/attendance/history"],
      ["attendance-summary", "/attendance/summary"],
      ["treasury", "/treasury"],
      ["admin", "/admin"],
      ["admin-access", "/admin/access-requests"],
      ["admin-families", "/admin/families"],
      ["admin-news", "/admin/news"],
      ["admin-news-new", "/admin/news/new"],
      ["admin-matches", "/admin/matches"],
      ["admin-players", "/admin/players"],
      ["admin-player-import", "/admin/players/import"],
      ["admin-seasons", "/admin/seasons"],
      ["admin-staff", "/admin/staff"],
      ["admin-teams", "/admin/teams"],
      ["admin-trainings", "/admin/trainings"],
      ["admin-shop", "/admin/shop"],
      ["admin-shop-new", "/admin/shop/products/new"],
      ["admin-treasury", "/admin/treasury"],
    ];

for (const [table, name, route] of focusMode
  ? []
  : [
      ["teams", "team-detail", (id) => `/team/${id}`],
      ["matches", "match-detail", (id) => `/matches/${id}`],
      ["matches", "match-travel", (id) => `/matches/${id}/travel`],
      ["news_posts", "news-detail", (id) => `/news/${id}`],
      ["shop_products", "shop-product", (id) => `/shop/${id}`],
      ["shop_orders", "shop-order", (id) => `/shop/orders/${id}`],
      ["training_sessions", "attendance-session", (id) => `/attendance/${id}`],
      ["teams", "admin-team", (id) => `/admin/teams/${id}`],
      ["matches", "admin-match", (id) => `/admin/matches/${id}`],
      ["news_posts", "admin-news-edit", (id) => `/admin/news/${id}`],
      ["shop_products", "admin-shop-edit", (id) => `/admin/shop/products/${id}/edit`],
      ["treasury_period_closures", "admin-closure", (id) => `/admin/treasury/closures/${id}`],
    ]) {
  const { data } = await createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
    .from(table)
    .select("id")
    .limit(1)
    .maybeSingle();
  if (data?.id) routes.push([name, route(data.id)]);
}

const browser = await chromium.launch();
const results = [];

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  const context = await browser.newContext({ viewport });
  await context.addCookies(await createAuthCookies());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  for (const [name, route] of routes) {
    try {
      errors.length = 0;
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      const metrics = await page.evaluate(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            element.getAttribute("aria-hidden") !== "true" &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };
        const unnamed = [...document.querySelectorAll("button, input, select, textarea")]
          .filter(visible)
          .filter((element) => {
            const id = element.getAttribute("id");
            const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
            return !(
              element.getAttribute("aria-label") ||
              element.getAttribute("aria-labelledby") ||
              label?.textContent?.trim() ||
              element.closest("label")?.textContent?.trim() ||
              element.textContent?.trim() ||
              element.getAttribute("title")
            );
          })
          .map((element) => element.outerHTML.slice(0, 180));
        const smallTargets = [
          ...document.querySelectorAll(
            "button, input, select, textarea, [role='button'], [role='tab']",
          ),
        ]
          .filter(visible)
          .map((element) => ({
            element,
            target:
              element instanceof HTMLInputElement &&
              ["checkbox", "radio", "file"].includes(element.type)
                ? (element.closest("label") ??
                  (element.id
                    ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
                    : null) ??
                  element)
                : element,
          }))
          .map(({ element, target }) => ({
            width: Math.round(target.getBoundingClientRect().width),
            height: Math.round(target.getBoundingClientRect().height),
            control: element.outerHTML.slice(0, 220),
          }))
          .filter(({ width, height }) => width < 48 || height < 48);
        return {
          title: document.title,
          h1: document.querySelectorAll("h1").length,
          horizontalOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          unnamed,
          smallTargets,
          height: document.documentElement.scrollHeight,
        };
      });
      if (captureScreenshots) {
        await page.screenshot({
          path: join(outputDir, `${viewport.name}-${name}.png`),
          fullPage: true,
        });
      }
      results.push({
        viewport: viewport.name,
        route,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        errors: [...errors],
        ...metrics,
      });
    } catch (error) {
      results.push({
        viewport: viewport.name,
        route,
        status: null,
        finalUrl: page.url(),
        errors: [error instanceof Error ? error.message : String(error)],
        title: "",
        h1: 0,
        horizontalOverflow: 0,
        unnamed: [],
        smallTargets: [],
        height: 0,
      });
    }
    await writeFile(resultPath, JSON.stringify(results, null, 2), "utf8");
  }

  await context.close();
}

await browser.close();
const problems = results.filter(
  (result) =>
    result.status !== 200 ||
    new URL(result.finalUrl).origin !== baseUrl ||
    result.errors.length > 0 ||
    result.h1 !== 1 ||
    result.horizontalOverflow > 1 ||
    result.unnamed.length > 0 ||
    result.smallTargets.length > 0,
);
await writeFile(
  resultPath,
  JSON.stringify({ outputDir, checked: results.length, results, problems }, null, 2),
  "utf8",
);
console.log(JSON.stringify({ outputDir, checked: results.length, problems }, null, 2));
process.exitCode = problems.length > 0 ? 1 : 0;

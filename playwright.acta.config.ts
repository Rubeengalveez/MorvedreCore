import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "acta-youth.spec.ts",
  timeout: 45_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4185",
    ...devices["Desktop Chrome"],
    viewport: { width: 393, height: 852 },
    serviceWorkers: "allow",
  },
  webServer: {
    command: "npm start -- -p 4185",
    url: "http://localhost:4185/acta",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

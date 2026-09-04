import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workerSource = readFileSync(join(process.cwd(), "app/sw.ts"), "utf8");

describe("service worker privacy policy", () => {
  it("does not install the framework default runtime cache", () => {
    expect(workerSource).not.toContain("defaultCache");
  });

  it("keeps runtime caching limited to public static assets", () => {
    expect(workerSource).toContain('const STATIC_CACHE_NAME = "morvedre-static-assets-v2"');
    expect(workerSource).toContain("cacheName: STATIC_CACHE_NAME");
    expect(workerSource).toContain("url.origin === self.location.origin");
    expect(workerSource).not.toMatch(/startsWith\(["']\/api\//);
  });
});

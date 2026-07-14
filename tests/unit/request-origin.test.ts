import { describe, expect, it, vi } from "vitest";

import { getAppOrigin } from "@/lib/auth/request-origin";

function request(url: string, host: string) {
  const parsed = new URL(url);
  return {
    headers: new Headers({ host }),
    nextUrl: { origin: parsed.origin, hostname: parsed.hostname },
  } as Parameters<typeof getAppOrigin>[0];
}

describe("getAppOrigin", () => {
  it("prefiere el host real de localhost frente al bind 0.0.0.0", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getAppOrigin(request("http://0.0.0.0:3000/api/auth/google", "localhost:3000"))).toBe(
      "http://localhost:3000",
    );
  });

  it("admite la IP privada usada para probar desde el móvil", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getAppOrigin(request("http://0.0.0.0:3000/api/auth/google", "192.168.68.64:3000"))).toBe(
      "http://192.168.68.64:3000",
    );
  });
});

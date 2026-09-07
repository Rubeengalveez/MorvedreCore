import { describe, expect, it } from "vitest";
import { getSafeNotificationPath } from "@/lib/pwa/notification-url";

describe("getSafeNotificationPath", () => {
  it("keeps internal paths with query strings and fragments", () => {
    expect(getSafeNotificationPath("/matches/partido-1?tab=convocatoria#equipo")).toBe(
      "/matches/partido-1?tab=convocatoria#equipo",
    );
  });

  it.each([
    undefined,
    null,
    "",
    "dashboard",
    "//evil.example/path",
    "https://evil.example/path",
    "javascript:alert(1)",
  ])("falls back for an unsafe destination: %s", (value) => {
    expect(getSafeNotificationPath(value)).toBe("/notifications");
  });
});

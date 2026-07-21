import { describe, expect, it } from "vitest";

import { isSafeMapsUrl, mapsUrlInputSchema, optionalMapsUrlSchema } from "@/lib/domain/maps";

describe("map links", () => {
  it("accepts secure links from Google Maps and other map services", () => {
    expect(isSafeMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isSafeMapsUrl("https://maps.apple.com/?q=Piscina")).toBe(true);
    expect(mapsUrlInputSchema.safeParse("https://www.openstreetmap.org/way/1").success).toBe(true);
  });

  it("rejects insecure, malformed and credential-bearing links", () => {
    expect(isSafeMapsUrl("http://maps.example.com/piscina")).toBe(false);
    expect(isSafeMapsUrl("https://user:pass@example.com/piscina")).toBe(false);
    expect(mapsUrlInputSchema.safeParse("no es un enlace").success).toBe(false);
  });

  it("normalizes an empty optional map link to null", () => {
    expect(optionalMapsUrlSchema.parse("   ")).toBeNull();
  });
});

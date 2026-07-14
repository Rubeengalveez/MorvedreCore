import { describe, expect, it } from "vitest";

import { normalizeSpanishPhone } from "@/lib/domain/phone";

describe("normalizeSpanishPhone", () => {
  it("normalizes a Spanish mobile number", () => {
    expect(normalizeSpanishPhone("612 345 678")).toBe("+34612345678");
  });

  it("keeps a valid international number", () => {
    expect(normalizeSpanishPhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("rejects malformed numbers", () => {
    expect(normalizeSpanishPhone("1234")).toBeNull();
    expect(normalizeSpanishPhone("texto")).toBeNull();
  });
});

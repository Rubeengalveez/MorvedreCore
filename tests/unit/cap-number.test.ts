import { describe, expect, it } from "vitest";

import { validCapNumber } from "@/lib/domain/cap-number";

describe("validCapNumber", () => {
  it("keeps only real cap numbers", () => {
    expect(validCapNumber(1)).toBe(1);
    expect(validCapNumber(14)).toBe(14);
    expect(validCapNumber(0)).toBeNull();
    expect(validCapNumber(15)).toBeNull();
    expect(validCapNumber(18)).toBeNull();
    expect(validCapNumber(null)).toBeNull();
  });
});

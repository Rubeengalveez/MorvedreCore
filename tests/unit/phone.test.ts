import { describe, expect, it } from "vitest";

import { normalizeSpanishPhone, toSpanishPhoneDigits } from "@/lib/domain/phone";

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

describe("toSpanishPhoneDigits", () => {
  it("converts a stored Spanish E.164 phone to nine editable digits", () => {
    expect(toSpanishPhoneDigits("+34612345678")).toBe("612345678");
  });

  it("removes non-numeric characters and limits the value to nine digits", () => {
    expect(toSpanishPhoneDigits("612 345 678 letras")).toBe("612345678");
    expect(toSpanishPhoneDigits("61234567890")).toBe("612345678");
  });

  it("keeps an empty phone empty", () => {
    expect(toSpanishPhoneDigits(null)).toBe("");
  });
});

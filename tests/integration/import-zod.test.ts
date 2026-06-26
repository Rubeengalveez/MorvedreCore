// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  RELATION_VALUES,
  emptyToUndefined,
  isRowEmpty,
  isRowIncomplete,
  makeRowSchema,
  normalizeRow,
  parseImportRow,
} from "@/lib/domain/import-schema.mjs";

const CURRENT_YEAR = 2026;

describe("emptyToUndefined", () => {
  it("returns undefined for null and undefined", () => {
    expect(emptyToUndefined(null)).toBeUndefined();
    expect(emptyToUndefined(undefined)).toBeUndefined();
  });

  it("returns undefined for empty or whitespace-only strings", () => {
    expect(emptyToUndefined("")).toBeUndefined();
    expect(emptyToUndefined("   ")).toBeUndefined();
    expect(emptyToUndefined("\t\n")).toBeUndefined();
  });

  it("passes through non-empty strings unchanged", () => {
    expect(emptyToUndefined("hello")).toBe("hello");
    expect(emptyToUndefined("  hi  ")).toBe("  hi  ");
  });

  it("passes through numbers, booleans, and objects", () => {
    expect(emptyToUndefined(42)).toBe(42);
    expect(emptyToUndefined(0)).toBe(0);
    expect(emptyToUndefined(false)).toBe(false);
    const obj = { a: 1 };
    expect(emptyToUndefined(obj)).toBe(obj);
  });
});

describe("normalizeRow", () => {
  it("converts null and undefined values to undefined", () => {
    expect(normalizeRow({ a: null, b: undefined })).toEqual({ a: undefined, b: undefined });
  });

  it("trims string values and converts empty strings to undefined", () => {
    expect(normalizeRow({ a: "  hello  ", b: "", c: "x" })).toEqual({
      a: "hello",
      b: undefined,
      c: "x",
    });
  });

  it("passes numbers and other primitives through unchanged", () => {
    expect(normalizeRow({ a: 42, b: false, c: 0 })).toEqual({ a: 42, b: false, c: 0 });
  });

  it("returns an empty object for empty input", () => {
    expect(normalizeRow({})).toEqual({});
  });
});

describe("isRowEmpty", () => {
  it("returns true when all values are undefined", () => {
    expect(isRowEmpty({ a: undefined, b: undefined, c: undefined })).toBe(true);
  });

  it("returns true for an empty object", () => {
    expect(isRowEmpty({})).toBe(true);
  });

  it("returns false when at least one value is defined", () => {
    expect(isRowEmpty({ a: undefined, b: "x" })).toBe(false);
    expect(isRowEmpty({ a: 0, b: undefined })).toBe(false);
    expect(isRowEmpty({ a: null, b: "x" })).toBe(false);
  });
});

describe("isRowIncomplete", () => {
  it("returns true when nombre_completo is missing", () => {
    expect(isRowIncomplete({ nombre_completo: undefined, ano_nacimiento: 2015 })).toBe(true);
  });

  it("returns true when ano_nacimiento is missing", () => {
    expect(isRowIncomplete({ nombre_completo: "Ana", ano_nacimiento: undefined })).toBe(true);
  });

  it("returns true when both are missing", () => {
    expect(isRowIncomplete({})).toBe(true);
  });

  it("returns false when both required fields are present", () => {
    expect(isRowIncomplete({ nombre_completo: "Ana", ano_nacimiento: 2015 })).toBe(false);
  });
});

describe("RELATION_VALUES", () => {
  it("exposes the four canonical relations", () => {
    expect([...RELATION_VALUES].sort()).toEqual(
      ["father", "legal_guardian", "mother", "other"].sort(),
    );
  });
});

describe("makeRowSchema", () => {
  it("accepts a minimal valid row", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "Jugador Ejemplo",
      ano_nacimiento: 2015,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated valid row", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "Jugador Completo",
      ano_nacimiento: 2013,
      dorsal: 7,
      email_tutor: "tutor@example.com",
      nombre_tutor: "Tutor Apellido",
      telefono_tutor: "+34611222333",
      relacion: "mother",
      nombre_equipo: "Alevin A",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dorsal).toBe(7);
      expect(result.data.relacion).toBe("mother");
    }
  });

  it("rejects empty nombre_completo", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({ nombre_completo: "", ano_nacimiento: 2015 });
    expect(result.success).toBe(false);
  });

  it("rejects missing ano_nacimiento", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({ nombre_completo: "Sin año" });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric ano_nacimiento", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({ nombre_completo: "X", ano_nacimiento: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects ano_nacimiento older than currentYear - 25", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "Veterano",
      ano_nacimiento: CURRENT_YEAR - 26,
    });
    expect(result.success).toBe(false);
  });

  it("rejects ano_nacimiento newer than currentYear + 1", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "Futuro",
      ano_nacimiento: CURRENT_YEAR + 2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts ano_nacimiento exactly at the lower bound (currentYear - 25)", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "Limite",
      ano_nacimiento: CURRENT_YEAR - 25,
    });
    expect(result.success).toBe(true);
  });

  it("accepts ano_nacimiento exactly at the upper bound (currentYear + 1)", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "Bebe",
      ano_nacimiento: CURRENT_YEAR + 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects dorsal out of range (< 0)", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
      dorsal: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects dorsal out of range (> 99)", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
      dorsal: 100,
    });
    expect(result.success).toBe(false);
  });

  it("treats empty dorsal as missing (not 0)", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
      dorsal: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dorsal).toBeUndefined();
    }
  });

  it("rejects invalid email_tutor", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
      email_tutor: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty email_tutor (treated as missing)", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
      email_tutor: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email_tutor).toBeUndefined();
    }
  });

  it("defaults relacion to legal_guardian when missing", () => {
    const schema = makeRowSchema(CURRENT_YEAR);
    const result = schema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relacion).toBe("legal_guardian");
    }
  });
});

describe("parseImportRow", () => {
  it("returns 'empty' for rows where all values are undefined", () => {
    const result = parseImportRow({ a: null, b: undefined }, CURRENT_YEAR);
    expect(result.status).toBe("empty");
  });

  it("returns 'empty' for an empty object", () => {
    const result = parseImportRow({}, CURRENT_YEAR);
    expect(result.status).toBe("empty");
  });

  it("returns 'incomplete' when only nombre_completo is present", () => {
    const result = parseImportRow({ nombre_completo: "Solo Nombre" }, CURRENT_YEAR);
    expect(result.status).toBe("incomplete");
  });

  it("returns 'incomplete' when only ano_nacimiento is present", () => {
    const result = parseImportRow({ ano_nacimiento: 2015 }, CURRENT_YEAR);
    expect(result.status).toBe("incomplete");
  });

  it("returns 'ok' with parsed data for a valid row", () => {
    const result = parseImportRow(
      {
        nombre_completo: "Jugador OK",
        ano_nacimiento: 2015,
        dorsal: 9,
      },
      CURRENT_YEAR,
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.nombre_completo).toBe("Jugador OK");
      expect(result.data.ano_nacimiento).toBe(2015);
      expect(result.data.dorsal).toBe(9);
    }
  });

  it("returns 'error' with reasons for invalid rows", () => {
    const result = parseImportRow(
      {
        nombre_completo: "Mal Año",
        ano_nacimiento: 1900,
      },
      CURRENT_YEAR,
    );
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toContain("ano_nacimiento");
      expect(result.name).toBe("Mal Año");
    }
  });

  it("trims whitespace from string values before parsing", () => {
    const result = parseImportRow(
      {
        nombre_completo: "  Con Espacios  ",
        ano_nacimiento: 2015,
      },
      CURRENT_YEAR,
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.nombre_completo).toBe("Con Espacios");
    }
  });
});

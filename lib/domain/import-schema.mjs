import { z } from "zod";

export const RELATION_VALUES = [
  "mother",
  "father",
  "legal_guardian",
  "other",
];

export function emptyToUndefined(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

/**
 * @typedef {{
 *   nombre_completo: string,
 *   ano_nacimiento: number,
 *   dorsal: number | undefined,
 *   email_tutor: string | undefined,
 *   nombre_tutor: string | undefined,
 *   telefono_tutor: string | undefined,
 *   relacion: "mother" | "father" | "legal_guardian" | "other",
 *   nombre_equipo: string | undefined
 * }} ParsedImportRowData
 */

/**
 * @typedef {{
 *   status: "ok",
 *   data: ParsedImportRowData
 * }} ParseImportRowResultOk
 *
 * @typedef {{ status: "empty" }} ParseImportRowResultEmpty
 *
 * @typedef {{ status: "incomplete" }} ParseImportRowResultIncomplete
 *
 * @typedef {{
 *   status: "error",
 *   reason: string,
 *   name: string | undefined
 * }} ParseImportRowResultError
 *
 * @typedef {ParseImportRowResultOk | ParseImportRowResultEmpty | ParseImportRowResultIncomplete | ParseImportRowResultError} ParseImportRowResult
 */

export function makeRowSchema(currentYear) {
  return z.object({
    nombre_completo: z
      .string({ invalid_type_error: "nombre_completo debe ser texto" })
      .trim()
      .min(1, "nombre_completo es obligatorio"),
    ano_nacimiento: z.coerce
      .number({ invalid_type_error: "ano_nacimiento debe ser numérico" })
      .int("ano_nacimiento debe ser un entero")
      .gte(currentYear - 25, `ano_nacimiento debe ser >= ${currentYear - 25}`)
      .lte(currentYear + 1, `ano_nacimiento debe ser <= ${currentYear + 1}`),
    dorsal: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: "dorsal debe ser numérico" })
        .int("dorsal debe ser entero")
        .min(0, "dorsal debe ser >= 0")
        .max(99, "dorsal debe ser <= 99")
        .optional(),
    ),
    email_tutor: z.preprocess(
      emptyToUndefined,
      z
        .string({ invalid_type_error: "email_tutor debe ser texto" })
        .trim()
        .email("email_tutor no es un email válido")
        .optional(),
    ),
    nombre_tutor: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional(),
    ),
    telefono_tutor: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional(),
    ),
    relacion: z.enum(RELATION_VALUES).default("legal_guardian"),
    nombre_equipo: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional(),
    ),
  });
}

export function normalizeRow(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      out[key] = undefined;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed === "" ? undefined : trimmed;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function isRowEmpty(row) {
  return Object.values(row).every((v) => v === undefined);
}

export function isRowIncomplete(row) {
  return row.nombre_completo === undefined || row.ano_nacimiento === undefined;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {number} currentYear
 * @returns {ParseImportRowResult}
 */
export function parseImportRow(raw, currentYear) {
  const row = normalizeRow(raw);
  if (isRowEmpty(row)) {
    return { status: "empty" };
  }
  if (isRowIncomplete(row)) {
    return { status: "incomplete" };
  }
  const parsed = makeRowSchema(currentYear).safeParse(row);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "fila"}: ${i.message}`)
      .join("; ");
    return { status: "error", reason: issues, name: row.nombre_completo };
  }
  return { status: "ok", data: parsed.data };
}

export const VALID_RELATION_VALUES = RELATION_VALUES;

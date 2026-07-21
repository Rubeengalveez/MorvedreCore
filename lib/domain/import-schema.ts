import { z } from "zod";

export const RELATION_VALUES = ["mother", "father", "legal_guardian", "other"] as const;

export function emptyToUndefined(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

export function makeRowSchema(currentYear: number) {
  return z.object({
    nombre_completo: z.string().trim().min(1, "nombre_completo es obligatorio"),
    ano_nacimiento: z.coerce
      .number()
      .int("ano_nacimiento debe ser un entero")
      .gte(currentYear - 25, `ano_nacimiento debe ser >= ${currentYear - 25}`)
      .lte(currentYear + 1, `ano_nacimiento debe ser <= ${currentYear + 1}`),
    dorsal: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int("dorsal debe ser entero")
        .min(0, "dorsal debe ser >= 0")
        .max(99, "dorsal debe ser <= 99")
        .optional(),
    ),
    email_tutor: z.preprocess(
      emptyToUndefined,
      z.string().trim().email("email_tutor no es un email válido").optional(),
    ),
    nombre_tutor: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    telefono_tutor: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    relacion: z.enum(RELATION_VALUES).default("legal_guardian"),
    nombre_equipo: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  });
}

export const xlsxRowSchema = makeRowSchema;

export function normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
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

export function isRowEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v === undefined);
}

export function isRowIncomplete(row: Record<string, unknown>): boolean {
  return row.nombre_completo === undefined || row.ano_nacimiento === undefined;
}

export type ParseImportRowResult =
  | { status: "ok"; data: Record<string, unknown> }
  | { status: "empty" }
  | { status: "incomplete" }
  | { status: "error"; reason: string; name: string | undefined };

export function parseImportRow(
  raw: Record<string, unknown>,
  currentYear: number,
): ParseImportRowResult {
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
    return { status: "error", reason: issues, name: row.nombre_completo as string | undefined };
  }
  return { status: "ok", data: parsed.data };
}

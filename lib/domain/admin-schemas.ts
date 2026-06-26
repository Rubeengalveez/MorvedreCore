import { z } from "zod";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Usa el formato AAAA-MM-DD.");

export const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido. Usa el formato #RRGGBB.");

export const optionalHexColor = hexColor.optional();

export const idSchema = z.object({ id: z.string().uuid("Identificador inválido.") });

export const createSeasonSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(3, "La etiqueta debe tener al menos 3 caracteres.")
      .max(50, "Máximo 50 caracteres."),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((data) => data.start_date < data.end_date, {
    message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    path: ["end_date"],
  });

export const updateSeasonSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(3, "La etiqueta debe tener al menos 3 caracteres.")
      .max(50, "Máximo 50 caracteres.")
      .optional(),
    start_date: isoDate.optional(),
    end_date: isoDate.optional(),
  })
  .refine(
    (data) => data.start_date == null || data.end_date == null || data.start_date < data.end_date,
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
      path: ["end_date"],
    },
  );

export const categoryEnum = z.enum([
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
]);

export const teamGenderEnum = z.enum(["male", "female", "mixed"]);
export const teamTypeEnum = z.enum(["competitive", "school"]);
export const staffRoleEnum = z.enum([
  "head_coach",
  "assistant_coach",
  "delegate",
  "physical_trainer",
]);

export const createTeamSchema = z.object({
  season_id: z.string().uuid("Temporada inválida."),
  category_code: categoryEnum,
  label: z
    .string()
    .trim()
    .min(1, "El nombre del equipo es obligatorio.")
    .max(50, "Máximo 50 caracteres."),
  gender: teamGenderEnum,
  team_type: teamTypeEnum.optional(),
  color: hexColor.optional(),
  home_pool: z.string().trim().max(100, "Máximo 100 caracteres.").optional(),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
});

export const updateTeamSchema = z
  .object({
    season_id: z.string().uuid("Temporada inválida.").optional(),
    category_code: categoryEnum.optional(),
    label: z
      .string()
      .trim()
      .min(1, "El nombre del equipo es obligatorio.")
      .max(50, "Máximo 50 caracteres.")
      .optional(),
    gender: teamGenderEnum.optional(),
    team_type: teamTypeEnum.optional(),
    color: hexColor.optional(),
    home_pool: z.string().trim().max(100, "Máximo 100 caracteres.").nullable().optional(),
    notes: z.string().trim().max(1000, "Máximo 1000 caracteres.").nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export const staffSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  profile_id: z.string().uuid("Persona inválida."),
  role: staffRoleEnum,
});

export const unrosterSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  player_id: z.string().uuid("Jugador inválido."),
});

export const genderEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);
export const userRoleEnum = z.enum([
  "admin",
  "coach",
  "delegate",
  "directiva",
  "parent",
  "player",
]);
export const parentRelationEnum = z.enum([
  "mother",
  "father",
  "legal_guardian",
  "other",
]);

export const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Formato E.164: +34612345678")
  .optional();

export const createPlayerSchema = z.object({
  full_name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  birth_year: z
    .number()
    .int("Año entero.")
    .min(1900, "Año entre 1900 y 2100.")
    .max(2100, "Año entre 1900 y 2100."),
  gender: genderEnum.optional(),
  cap_number: z.number().int("Dorsal entero.").min(0, "Mínimo 0.").max(99, "Máximo 99.").optional(),
  phone_e164: phoneSchema,
  email_contact: z.string().email("Email inválido.").optional(),
  photo_url: z.string().url("URL inválida.").optional(),
  team_color: optionalHexColor,
  school_enrolled: z.boolean().optional(),
  school_payment_paid: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
  license_active: z.boolean().optional(),
  notes: z.preprocess(
    emptyToNull,
    z.string().max(2000, "Máximo 2000 caracteres.").nullable().optional(),
  ),
});

export const updatePlayerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres.")
      .max(100, "Máximo 100 caracteres.")
      .optional(),
    birth_year: z
      .number()
      .int("Año entero.")
      .min(1900, "Año entre 1900 y 2100.")
      .max(2100, "Año entre 1900 y 2100.")
      .nullable()
      .optional(),
    gender: genderEnum.optional(),
    cap_number: z
      .number()
      .int("Dorsal entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .nullable()
      .optional(),
    phone_e164: z.preprocess(
      emptyToNull,
      z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
    ),
    email_contact: z.preprocess(emptyToNull, z.string().email("Email inválido.").nullable()),
    photo_url: z.preprocess(emptyToNull, z.string().url("URL inválida.").nullable()),
    team_color: z.preprocess(emptyToNull, hexColor.nullable()),
    school_enrolled: z.boolean().optional(),
    school_payment_paid: z.boolean().optional(),
    license_active: z.boolean().optional(),
    notes: z.preprocess(emptyToNull, z.string().max(2000, "Máximo 2000 caracteres.").nullable()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export const linkSchema = z.object({
  parent_profile_id: z.string().uuid("Tutor inválido."),
  child_profile_id: z.string().uuid("Hijo inválido."),
  relation: parentRelationEnum,
});

export const unlinkSchema = z.object({
  parent_profile_id: z.string().uuid("Tutor inválido."),
  child_profile_id: z.string().uuid("Hijo inválido."),
});

export const roleAssignmentSchema = z.object({
  profile_id: z.string().uuid("Persona inválida."),
  role: userRoleEnum,
  scope_team_id: z.string().uuid("Equipo inválido.").nullable().optional(),
});

export const RELATION_VALUES_XLSX = [
  "mother",
  "father",
  "legal_guardian",
  "other",
] as const;

export const xlsxRowSchema = z.object({
  nombre_completo: z.string().trim().min(1, "nombre_completo es obligatorio"),
  ano_nacimiento: z.coerce
    .number({ message: "ano_nacimiento debe ser numérico" })
    .int("ano_nacimiento debe ser entero")
    .gte(1900, "ano_nacimiento debe ser >= 1900")
    .lte(2100, "ano_nacimiento debe ser <= 2100"),
  dorsal: z.preprocess(
    (v) => (v == null || v === "" ? undefined : Number(v)),
    z.coerce
      .number({ message: "dorsal debe ser numérico" })
      .int("dorsal debe ser entero")
      .min(0, "dorsal debe ser >= 0")
      .max(99, "dorsal debe ser <= 99")
      .optional(),
  ),
  nombre_equipo: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().trim().optional(),
  ),
  email_tutor: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z
      .string({ message: "email_tutor debe ser texto" })
      .trim()
      .email("email_tutor no es un email válido")
      .optional(),
  ),
  nombre_tutor: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().trim().optional(),
  ),
  telefono_tutor: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().trim().optional(),
  ),
  relacion: z.preprocess(
    (v) => {
      if (v == null || v === "") return "legal_guardian";
      const lower = String(v).toLowerCase().trim();
      if ((RELATION_VALUES_XLSX as readonly string[]).includes(lower)) return lower;
      return "legal_guardian";
    },
    z.enum(RELATION_VALUES_XLSX),
  ),
});

export function makeRosterSchema() {
  return z.object({
    team_id: z.string().uuid("Equipo inválido."),
    player_id: z.string().uuid("Jugador inválido."),
    squad_number: z
      .number()
      .int("Dorsal entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .optional(),
    joined_at: isoDate.optional(),
  });
}

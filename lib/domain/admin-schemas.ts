import { z } from "zod";

import { optionalMapsUrlSchema } from "@/lib/domain/maps";

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

export const archiveSeasonSchema = createSeasonSchema.safeExtend({
  season_id: z.string().uuid("Temporada inválida."),
  confirmation: z.string().trim().min(1, "Escribe el nombre de la temporada para confirmar."),
});

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
  can_manage_attendance: z.boolean().optional().default(false),
});

export const staffAttendancePermissionSchema = z.object({
  profile_id: z.string().uuid("Persona inválida."),
  enabled: z.boolean(),
});

export const unrosterSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  player_id: z.string().uuid("Jugador inválido."),
});

export const genderEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);
export const userRoleEnum = z.enum(["admin", "coach", "delegate", "directiva", "parent", "player"]);
export const parentRelationEnum = z.enum(["mother", "father", "legal_guardian", "other"]);

export const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const nullIfEmpty = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? null : v;

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
      z
        .string()
        .regex(/^\+[1-9]\d{6,14}$/)
        .nullable(),
    ),
    email_contact: z.preprocess(emptyToNull, z.string().email("Email inválido.").nullable()),
    photo_url: z.preprocess(emptyToNull, z.string().url("URL inválida.").nullable()),
    team_color: z.preprocess(emptyToNull, hexColor.nullable()),
    school_enrolled: z.boolean().optional(),
    school_payment_paid: z.boolean().optional(),
    license_active: z.boolean().optional(),
    is_active: z.boolean().optional(),
    notes: z.preprocess(emptyToNull, z.string().max(2000, "Máximo 2000 caracteres.").nullable()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  photo_url: z.preprocess(nullIfEmpty, z.string().url("URL inválida.").nullable()),
  birth_year: z.preprocess(
    nullIfEmpty,
    z.preprocess(
      (v) => (v == null ? null : Number(v)),
      z
        .number()
        .int("Año entero.")
        .min(1900, "Año entre 1900 y 2100.")
        .max(2100, "Año entre 1900 y 2100.")
        .nullable(),
    ),
  ),
  cap_number: z.preprocess(
    nullIfEmpty,
    z.preprocess(
      (v) => (v == null ? null : Number(v)),
      z.number().int("Dorsal entero.").min(0, "Mínimo 0.").max(99, "Máximo 99.").nullable(),
    ),
  ),
  phone_e164: z.preprocess(
    nullIfEmpty,
    z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, "Formato E.164: +34612345678")
      .nullable(),
  ),
  email_contact: z.preprocess(nullIfEmpty, z.string().email("Email inválido.").nullable()),
  notes: z
    .preprocess(nullIfEmpty, z.string().max(1000, "Máximo 1000 caracteres.").nullable())
    .optional(),
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
  profile_id: z.string().uuid("Perfil inválido."),
  role: z.enum(["admin", "coach", "delegate", "directiva", "parent", "player"]),
  scope_team_id: z.string().uuid("Equipo inválido.").nullable().optional(),
});

export const createNewsPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "El título es demasiado corto.")
    .max(120, "Máximo 120 caracteres."),
  body_md: z
    .string()
    .trim()
    .min(1, "El cuerpo no puede estar vacío.")
    .max(8000, "Máximo 8000 caracteres."),
  image_url: z.string().url("URL de imagen inválida.").max(500).nullable().optional(),
  audience: z.enum(["club", "team"]).default("club"),
  audience_team_id: z.string().uuid().nullable().optional(),
  pinned: z.boolean().default(false),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateNewsPostSchema = createNewsPostSchema
  .safeExtend({
    post_id: z.string().uuid("Post inválido."),
  })
  .refine((v) => v.audience !== "team" || !!v.audience_team_id, {
    message: "Si la audiencia es un equipo, indica audience_team_id.",
    path: ["audience_team_id"],
  });

export const deleteNewsPostSchema = z.object({
  post_id: z.string().uuid("Post inválido."),
});

export const togglePinNewsSchema = z.object({
  post_id: z.string().uuid("Post inválido."),
  pinned: z.boolean(),
});

export const reactNewsSchema = z.object({
  post_id: z.string().uuid("Post inválido."),
  reaction: z.enum(["like", "fire", "thanks"]),
});

export const makeRosterSchema = z.object({
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

export const trainingKindSchema = z.enum(["water", "dry", "physical", "technical", "mixed"]);

export const createTrainingBlockSchema = z
  .object({
    team_id: z.string().uuid("Equipo inválido."),
    label: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, "Selecciona al menos un día."),
    start_date: isoDate,
    end_date: isoDate,
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inicio inválida (HH:MM)."),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora fin inválida (HH:MM)."),
    location: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "Máximo 200 caracteres.").nullable().optional(),
    ),
    maps_url: optionalMapsUrlSchema,
    kind: trainingKindSchema.optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
    path: ["end_date"],
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["end_time"],
  });

const trainingScheduleGroupSchema = z
  .object({
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, "Selecciona al menos un día."),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inicio inválida (HH:MM)."),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora fin inválida (HH:MM)."),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["end_time"],
  });

export const createTrainingScheduleSchema = z
  .object({
    team_id: z.string().uuid("Equipo inválido."),
    label: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
    start_date: isoDate,
    end_date: isoDate,
    location: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "Máximo 200 caracteres.").nullable().optional(),
    ),
    maps_url: optionalMapsUrlSchema,
    kind: trainingKindSchema.optional(),
    replace_existing: z.boolean().optional(),
    groups: z.array(trainingScheduleGroupSchema).min(1, "Añade al menos un horario.").max(7),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
    path: ["end_date"],
  });

export const updateTrainingBlockSchema = z
  .object({
    team_id: z.string().uuid("Equipo inválido.").optional(),
    label: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres.")
      .max(100, "Máximo 100 caracteres.")
      .optional(),
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Selecciona al menos un día.")
      .optional(),
    start_date: isoDate.optional(),
    end_date: isoDate.optional(),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Hora inicio inválida (HH:MM).")
      .optional(),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Hora fin inválida (HH:MM).")
      .optional(),
    location: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "Máximo 200 caracteres.").nullable().optional(),
    ),
    maps_url: optionalMapsUrlSchema,
    kind: trainingKindSchema.optional(),
  })
  .refine(
    (data) => data.start_date == null || data.end_date == null || data.end_date >= data.start_date,
    {
      message: "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
      path: ["end_date"],
    },
  )
  .refine(
    (data) => data.start_time == null || data.end_time == null || data.end_time > data.start_time,
    {
      message: "La hora de fin debe ser posterior a la hora de inicio.",
      path: ["end_time"],
    },
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export const cancelTrainingSessionSchema = z.object({
  session_id: z.string().uuid("Sesión inválida."),
  reason: z.string().trim().min(2, "Indica un motivo.").max(500, "Máximo 500 caracteres."),
});

export const competitionTypeSchema = z.enum(["league", "cup", "tournament", "friendly"]);

export const matchStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "played",
  "cancelled",
  "postponed",
]);

export const callupStatusSchema = z.enum([
  "called",
  "confirmed",
  "declined",
  "withdrawn",
  "no_show",
]);

export const createMatchSchema = z.object({
  season_id: z.string().uuid("Temporada inválida."),
  team_id: z.string().uuid("Equipo inválido."),
  opponent: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  competition_type: competitionTypeSchema.optional(),
  is_home: z.boolean().optional(),
  location: z.preprocess(
    emptyToNull,
    z.string().trim().max(200, "Máximo 200 caracteres.").nullable().optional(),
  ),
  maps_url: optionalMapsUrlSchema,
  pool_name: z.preprocess(
    emptyToNull,
    z.string().trim().max(100, "Máximo 100 caracteres.").nullable().optional(),
  ),
  scheduled_at: z.string().datetime({ offset: true, message: "Fecha inválida (ISO con offset)." }),
  logistics_enabled: z.boolean().optional(),
  notes: z.preprocess(
    emptyToNull,
    z.string().trim().max(2000, "Máximo 2000 caracteres.").nullable().optional(),
  ),
});

export const updateMatchSchema = z
  .object({
    season_id: z.string().uuid("Temporada inválida.").optional(),
    team_id: z.string().uuid("Equipo inválido.").optional(),
    opponent: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres.")
      .max(100, "Máximo 100 caracteres.")
      .optional(),
    competition_type: competitionTypeSchema.optional(),
    is_home: z.boolean().optional(),
    location: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "Máximo 200 caracteres.").nullable().optional(),
    ),
    maps_url: optionalMapsUrlSchema,
    pool_name: z.preprocess(
      emptyToNull,
      z.string().trim().max(100, "Máximo 100 caracteres.").nullable().optional(),
    ),
    scheduled_at: z
      .string()
      .datetime({ offset: true, message: "Fecha inválida (ISO con offset)." })
      .optional(),
    status: matchStatusSchema.optional(),
    logistics_enabled: z.boolean().optional(),
    notes: z.preprocess(
      emptyToNull,
      z.string().trim().max(2000, "Máximo 2000 caracteres.").nullable().optional(),
    ),
    final_score_us: z
      .number()
      .int("Resultado entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .nullable()
      .optional(),
    final_score_them: z
      .number()
      .int("Resultado entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export const createCallupSchema = z.object({
  match_id: z.string().uuid("Partido inválido."),
  player_id: z.string().uuid("Jugador inválido."),
  cap_number: z
    .number()
    .int("Dorsal entero.")
    .min(0, "Mínimo 0.")
    .max(99, "Máximo 99.")
    .nullable()
    .optional(),
  source_team_id: z.string().uuid("Equipo de origen inválido.").nullable().optional(),
});

export const updateCallupSchema = z
  .object({
    callup_id: z.string().uuid("Convocatoria inválida."),
    cap_number: z
      .number()
      .int("Dorsal entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .nullable()
      .optional(),
    status: callupStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export const recordMatchStatSchema = z.object({
  match_id: z.string().uuid("Partido inválido."),
  player_id: z.string().uuid("Jugador inválido."),
  goals: z.number().int("Goles enteros.").min(0, "Mínimo 0.").max(99, "Máximo 99.").optional(),
  exclusions: z
    .number()
    .int("Expulsiones enteras.")
    .min(0, "Mínimo 0.")
    .max(3, "Máximo 3 expulsiones por partido (normativa).")
    .optional(),
  mvp: z.boolean().optional(),
});

export const validateMatchStatsSchema = z.object({
  match_id: z.string().uuid("Partido inválido."),
});

export const setAvailabilitySchema = z.object({
  date: isoDate,
  available: z.boolean(),
  reason: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "Máximo 500 caracteres.").nullable().optional(),
  ),
});

export const markAttendanceSchema = z.object({
  session_id: z.string().uuid("Sesión inválida."),
  entries: z
    .array(
      z.object({
        player_id: z.string().uuid("Jugador inválido."),
        present: z.boolean(),
        reason: z.preprocess(
          emptyToNull,
          z.string().trim().max(500, "Máximo 500 caracteres.").nullable().optional(),
        ),
      }),
    )
    .min(0)
    .max(50)
    .superRefine((entries, context) => {
      const seen = new Set<string>();
      for (const entry of entries) {
        if (seen.has(entry.player_id)) {
          context.addIssue({
            code: "custom",
            message: "Hay jugadores repetidos en la lista.",
          });
          return;
        }
        seen.add(entry.player_id);
      }
    }),
});

export const setMatchStatusSchema = z.object({
  match_id: z.string().uuid("Partido inválido."),
  status: matchStatusSchema,
  final_score_us: z
    .number()
    .int("Resultado entero.")
    .min(0, "Mínimo 0.")
    .max(99, "Máximo 99.")
    .nullable()
    .optional(),
  final_score_them: z
    .number()
    .int("Resultado entero.")
    .min(0, "Mínimo 0.")
    .max(99, "Máximo 99.")
    .nullable()
    .optional(),
});

export const recomputeRankingSchema = z.object({
  season_id: z.string().uuid("Temporada inválida."),
  player_id: z.string().uuid("Jugador inválido."),
});

export const unvalidateMatchStatsSchema = z.object({
  match_id: z.string().uuid("Partido inválido."),
  reason: z
    .string()
    .trim()
    .min(5, "Indica un motivo de al menos 5 caracteres.")
    .max(500, "Máximo 500 caracteres."),
});

export const bulkUnvalidateMatchStatsSchema = z.object({
  match_ids: z
    .array(z.string().uuid("Partido inválido."))
    .min(1, "Selecciona al menos un partido.")
    .max(50, "Máximo 50 partidos a la vez."),
  reason: z
    .string()
    .trim()
    .min(5, "Indica un motivo de al menos 5 caracteres.")
    .max(500, "Máximo 500 caracteres."),
});

export const upsertShopProductSchema = z.object({
  title: z.string().trim().min(3, "El t�tulo es demasiado corto.").max(80, "M�ximo 80 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "La descripci�n no puede estar vac�a.")
    .max(2000, "M�ximo 2000 caracteres."),
  category: z
    .string()
    .trim()
    .min(1, "La categor�a es obligatoria.")
    .max(40, "M�ximo 40 caracteres."),
  price_eur: z.number().min(0.01, "El precio debe ser mayor que 0.").max(1000, "M�ximo 1000�."),
  image_url: z.string().url("URL inv�lida.").max(500).nullable().optional(),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
  available: z.boolean().default(true),
  max_per_order: z.number().int().min(1).max(20).default(10),
  personalization_enabled: z.boolean().default(false),
  personalization_label: z.string().trim().min(1).max(40).default("Nombre"),
  personalization_max_length: z.number().int().min(1).max(60).default(30),
});

export const updateShopProductSchema = upsertShopProductSchema.safeExtend({
  product_id: z.string().uuid("Producto inv�lido."),
});

export const deleteShopProductSchema = z.object({
  product_id: z.string().uuid("Producto inv�lido."),
});

export const createShopOrderSchema = z.object({
  contact_phone: z.string().trim().max(30).nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid("Producto inv�lido."),
        size: z.string().trim().max(20).nullable().optional(),
        personalization: z.string().trim().min(1).max(60).nullable().optional(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "A�ade al menos un producto.")
    .max(50, "M�ximo 50 productos por pedido."),
  notes: z.string().trim().max(500, "M�ximo 500 caracteres.").nullable().optional(),
});

export const decideShopOrderSchema = z.object({
  order_id: z.string().uuid("Pedido inv�lido."),
  decision: z.enum(["approve", "reject"]),
  contact_phone: z.string().trim().max(30).nullable().optional(),
  parent_notes: z.string().trim().max(500, "M�ximo 500 caracteres.").nullable().optional(),
});

export const updateShopOrderStatusSchema = z.object({
  order_id: z.string().uuid("Pedido inv�lido."),
  status: z.enum(["pending_admin", "ordered", "received", "delivered", "cancelled"]),
  admin_notes: z.string().trim().max(500, "M�ximo 500 caracteres.").nullable().optional(),
});

export const treasuryConceptKindSchema = z.enum([
  "fee",
  "material",
  "tournament",
  "adjustment",
  "discount",
]);

export const treasuryPeriodicitySchema = z.enum(["monthly", "seasonal", "one_off"]);
export const treasuryAppliesToSchema = z.enum(["all_players", "all_members", "specific_profile"]);

export const upsertTreasuryConceptSchema = z.object({
  concept_id: z.string().uuid("Concepto invalido.").optional(),
  code: z.string().trim().min(2, "Codigo demasiado corto.").max(40, "Maximo 40 caracteres."),
  label: z.string().trim().min(2, "Nombre demasiado corto.").max(100, "Maximo 100 caracteres."),
  kind: treasuryConceptKindSchema,
  periodicity: treasuryPeriodicitySchema,
  default_amount_eur: z.number().min(-5000).max(5000).nullable().optional(),
  applies_to: treasuryAppliesToSchema,
  active: z.boolean().default(true),
});

export const assignTreasuryConceptSchema = z.object({
  profile_id: z.string().uuid("Perfil invalido."),
  concept_id: z.string().uuid("Concepto invalido."),
  amount_eur: z.number().min(-5000).max(5000).nullable().optional(),
  starts_on: isoDate.nullable().optional(),
  ends_on: isoDate.nullable().optional(),
  active: z.boolean().default(true),
});

export const buildTreasuryClosureSchema = z
  .object({
    season_id: z.string().uuid("Temporada invalida."),
    period_start: isoDate,
    period_end: isoDate,
    sent_to_email: z.string().email("Email invalido.").nullable().optional(),
  })
  .refine((data) => data.period_start <= data.period_end, {
    message: "La fecha de fin debe ser igual o posterior al inicio.",
    path: ["period_end"],
  });

export const markTreasuryLinePaidSchema = z.object({
  line_id: z.string().uuid("Linea invalida."),
  paid: z.boolean(),
  paid_at: isoDate.nullable().optional(),
  payment_method: z.enum(["bank_transfer", "bizum", "cash", "other"]).nullable().optional(),
});

// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  bulkUnvalidateMatchStatsSchema,
  categoryEnum,
  createPlayerSchema,
  createSeasonSchema,
  createTeamSchema,
  emptyToNull,
  hexColor,
  idSchema,
  isoDate,
  linkSchema,
  parentRelationEnum,
  recomputeRankingSchema,
  roleAssignmentSchema,
  staffRoleEnum,
  staffSchema,
  teamGenderEnum,
  teamTypeEnum,
  unlinkSchema,
  unrosterSchema,
  unvalidateMatchStatsSchema,
  updatePlayerSchema,
  updateProfileSchema,
  updateSeasonSchema,
  updateTeamSchema,
  userRoleEnum,
  xlsxRowSchema,
} from "@/lib/domain/admin-schemas";

describe("isoDate", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    expect(isoDate.safeParse("2025-09-01").success).toBe(true);
  });

  it("rejects an invalid date format", () => {
    expect(isoDate.safeParse("2025/09/01").success).toBe(false);
    expect(isoDate.safeParse("01-09-2025").success).toBe(false);
    expect(isoDate.safeParse("not-a-date").success).toBe(false);
  });
});

describe("hexColor", () => {
  it("accepts a valid hex color", () => {
    expect(hexColor.safeParse("#0A2E5C").success).toBe(true);
    expect(hexColor.safeParse("#ffffff").success).toBe(true);
  });

  it("rejects an invalid color", () => {
    expect(hexColor.safeParse("red").success).toBe(false);
    expect(hexColor.safeParse("#FFF").success).toBe(false);
    expect(hexColor.safeParse("#GGGGGG").success).toBe(false);
  });
});

describe("idSchema", () => {
  it("accepts a valid UUID", () => {
    expect(idSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
  });

  it("rejects a non-UUID id", () => {
    expect(idSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
    expect(idSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("createSeasonSchema", () => {
  it("accepts a valid season with proper date order", () => {
    const result = createSeasonSchema.safeParse({
      label: "2025/2026",
      start_date: "2025-09-01",
      end_date: "2026-07-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short label", () => {
    const result = createSeasonSchema.safeParse({
      label: "ab",
      start_date: "2025-09-01",
      end_date: "2026-07-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-long label", () => {
    const result = createSeasonSchema.safeParse({
      label: "x".repeat(51),
      start_date: "2025-09-01",
      end_date: "2026-07-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when end_date is before or equal to start_date", () => {
    const inverted = createSeasonSchema.safeParse({
      label: "Invertedida",
      start_date: "2026-07-31",
      end_date: "2025-09-01",
    });
    expect(inverted.success).toBe(false);

    const equal = createSeasonSchema.safeParse({
      label: "Igual",
      start_date: "2025-09-01",
      end_date: "2025-09-01",
    });
    expect(equal.success).toBe(false);
  });

  it("rejects malformed dates", () => {
    const result = createSeasonSchema.safeParse({
      label: "2025/2026",
      start_date: "2025/09/01",
      end_date: "2026-07-31",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSeasonSchema", () => {
  it("accepts an empty object (refinement says no changes)", () => {
    const result = updateSeasonSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a partial update", () => {
    const result = updateSeasonSchema.safeParse({ label: "Nueva etiqueta" });
    expect(result.success).toBe(true);
  });

  it("rejects inverted dates when both provided", () => {
    const result = updateSeasonSchema.safeParse({
      start_date: "2026-07-31",
      end_date: "2025-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("allows only one of the dates", () => {
    const startOnly = updateSeasonSchema.safeParse({ start_date: "2025-09-01" });
    expect(startOnly.success).toBe(true);
    const endOnly = updateSeasonSchema.safeParse({ end_date: "2026-07-31" });
    expect(endOnly.success).toBe(true);
  });
});

describe("categoryEnum", () => {
  it("accepts every documented category", () => {
    for (const code of [
      "benjamin",
      "alevin",
      "infantil",
      "cadete",
      "juvenil",
      "absoluto",
      "escuela",
    ]) {
      expect(categoryEnum.safeParse(code).success).toBe(true);
    }
  });

  it("rejects unknown categories", () => {
    expect(categoryEnum.safeParse("senior").success).toBe(false);
    expect(categoryEnum.safeParse("").success).toBe(false);
  });
});

describe("teamGenderEnum and teamTypeEnum", () => {
  it("accepts every gender", () => {
    expect(teamGenderEnum.safeParse("male").success).toBe(true);
    expect(teamGenderEnum.safeParse("female").success).toBe(true);
    expect(teamGenderEnum.safeParse("mixed").success).toBe(true);
  });

  it("rejects unknown genders", () => {
    expect(teamGenderEnum.safeParse("other").success).toBe(false);
  });

  it("accepts every team_type", () => {
    expect(teamTypeEnum.safeParse("competitive").success).toBe(true);
    expect(teamTypeEnum.safeParse("school").success).toBe(true);
  });
});

describe("staffRoleEnum", () => {
  it("accepts every documented staff role", () => {
    expect(staffRoleEnum.safeParse("head_coach").success).toBe(true);
    expect(staffRoleEnum.safeParse("assistant_coach").success).toBe(true);
    expect(staffRoleEnum.safeParse("delegate").success).toBe(true);
    expect(staffRoleEnum.safeParse("physical_trainer").success).toBe(true);
  });

  it("rejects unknown roles", () => {
    expect(staffRoleEnum.safeParse("coach").success).toBe(false);
  });
});

describe("createTeamSchema", () => {
  const validTeam = {
    season_id: "550e8400-e29b-41d4-a716-446655440000",
    category_code: "alevin",
    label: "Alevin A",
    gender: "mixed",
  };

  it("accepts a minimal valid team", () => {
    expect(createTeamSchema.safeParse(validTeam).success).toBe(true);
  });

  it("accepts a full team with optional fields", () => {
    const result = createTeamSchema.safeParse({
      ...validTeam,
      team_type: "competitive",
      color: "#0A2E5C",
      home_pool: "Piscina Municipal",
      notes: "Equipo titular",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty label", () => {
    const result = createTeamSchema.safeParse({ ...validTeam, label: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid season_id", () => {
    const result = createTeamSchema.safeParse({ ...validTeam, season_id: "not-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid color", () => {
    const result = createTeamSchema.safeParse({ ...validTeam, color: "red" });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long home_pool", () => {
    const result = createTeamSchema.safeParse({ ...validTeam, home_pool: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("updateTeamSchema", () => {
  it("rejects an empty object (no changes)", () => {
    expect(updateTeamSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single-field update", () => {
    expect(updateTeamSchema.safeParse({ label: "Renombrado" }).success).toBe(true);
  });

  it("accepts null for nullable fields", () => {
    expect(
      updateTeamSchema.safeParse({ home_pool: null, notes: null }).success,
    ).toBe(true);
  });
});

describe("staffSchema", () => {
  const validStaff = {
    team_id: "550e8400-e29b-41d4-a716-446655440000",
    profile_id: "550e8400-e29b-41d4-a716-446655440001",
    role: "head_coach",
  };

  it("accepts a valid staff assignment", () => {
    expect(staffSchema.safeParse(validStaff).success).toBe(true);
  });

  it("rejects an invalid role", () => {
    expect(staffSchema.safeParse({ ...validStaff, role: "coach" }).success).toBe(false);
  });

  it("rejects non-UUID ids", () => {
    expect(staffSchema.safeParse({ ...validStaff, team_id: "x" }).success).toBe(false);
    expect(staffSchema.safeParse({ ...validStaff, profile_id: "x" }).success).toBe(false);
  });
});

describe("unrosterSchema", () => {
  it("accepts valid team and player UUIDs", () => {
    expect(
      unrosterSchema.safeParse({
        team_id: "550e8400-e29b-41d4-a716-446655440000",
        player_id: "550e8400-e29b-41d4-a716-446655440001",
      }).success,
    ).toBe(true);
  });

  it("rejects non-UUID values", () => {
    expect(unrosterSchema.safeParse({ team_id: "x", player_id: "y" }).success).toBe(false);
  });
});

describe("emptyToNull", () => {
  it("returns null for empty or whitespace strings", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull("\t")).toBeNull();
  });

  it("passes through non-empty strings", () => {
    expect(emptyToNull("hello")).toBe("hello");
    expect(emptyToNull("  hi  ")).toBe("  hi  ");
  });

  it("passes through non-strings", () => {
    expect(emptyToNull(42)).toBe(42);
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull(undefined)).toBeUndefined();
  });
});

describe("createPlayerSchema", () => {
  const validPlayer = {
    full_name: "Jugador Ejemplo",
    birth_year: 2010,
  };

  it("accepts a minimal valid player", () => {
    expect(createPlayerSchema.safeParse(validPlayer).success).toBe(true);
  });

  it("trims whitespace from full_name", () => {
    const result = createPlayerSchema.safeParse({
      ...validPlayer,
      full_name: "  Con Espacios  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe("Con Espacios");
    }
  });

  it("rejects a too-short full_name", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, full_name: "A" }).success).toBe(false);
  });

  it("rejects birth_year outside the [1900, 2100] range", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, birth_year: 1899 }).success).toBe(false);
    expect(createPlayerSchema.safeParse({ ...validPlayer, birth_year: 2101 }).success).toBe(false);
  });

  it("rejects a non-integer birth_year", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, birth_year: 2010.5 }).success).toBe(
      false,
    );
  });

  it("accepts a valid cap_number in range", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, cap_number: 7 }).success).toBe(true);
  });

  it("rejects cap_number out of range", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, cap_number: -1 }).success).toBe(false);
    expect(createPlayerSchema.safeParse({ ...validPlayer, cap_number: 100 }).success).toBe(false);
  });

  it("accepts a valid E.164 phone", () => {
    expect(
      createPlayerSchema.safeParse({ ...validPlayer, phone_e164: "+34611222333" }).success,
    ).toBe(true);
  });

  it("rejects a phone in the wrong format", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, phone_e164: "612345678" }).success).toBe(
      false,
    );
  });

  it("accepts a valid email_contact", () => {
    expect(
      createPlayerSchema.safeParse({ ...validPlayer, email_contact: "x@example.com" }).success,
    ).toBe(true);
  });

  it("rejects an invalid email_contact", () => {
    expect(createPlayerSchema.safeParse({ ...validPlayer, email_contact: "no-email" }).success).toBe(
      false,
    );
  });

  it("converts empty notes to null via preprocess", () => {
    const result = createPlayerSchema.safeParse({ ...validPlayer, notes: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });
});

describe("updatePlayerSchema", () => {
  it("rejects an empty object (no changes)", () => {
    expect(updatePlayerSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single-field update when other fields are explicit empty strings", () => {
    expect(
      updatePlayerSchema.safeParse({
        full_name: "Nuevo Nombre",
        phone_e164: "",
        email_contact: "",
        photo_url: "",
        team_color: "",
        notes: "",
      }).success,
    ).toBe(true);
  });

  it("accepts null for nullable fields when others are present", () => {
    expect(
      updatePlayerSchema.safeParse({
        birth_year: null,
        notes: null,
        phone_e164: "",
        email_contact: "",
        photo_url: "",
        team_color: "",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid phone even when other fields are present", () => {
    expect(
      updatePlayerSchema.safeParse({
        phone_e164: "not-valid",
        email_contact: "",
        photo_url: "",
        team_color: "",
        notes: "",
      }).success,
    ).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  const basePayload = {
    full_name: "Jugador Ejemplo",
  };

  it("accepts a minimal payload with only full_name", () => {
    const result = updateProfileSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe("Jugador Ejemplo");
      expect(result.data.photo_url).toBeNull();
      expect(result.data.birth_year).toBeNull();
      expect(result.data.cap_number).toBeNull();
      expect(result.data.phone_e164).toBeNull();
      expect(result.data.email_contact).toBeNull();
    }
  });

  it("coerces empty strings to null for nullable fields", () => {
    const result = updateProfileSchema.safeParse({
      full_name: "Jugador Ejemplo",
      photo_url: "",
      birth_year: "",
      cap_number: "",
      phone_e164: "",
      email_contact: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photo_url).toBeNull();
      expect(result.data.birth_year).toBeNull();
      expect(result.data.cap_number).toBeNull();
      expect(result.data.phone_e164).toBeNull();
      expect(result.data.email_contact).toBeNull();
    }
  });

  it("coerces birth_year and cap_number strings to numbers", () => {
    const result = updateProfileSchema.safeParse({
      full_name: "Jugador Ejemplo",
      birth_year: "2010",
      cap_number: "7",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.birth_year).toBe(2010);
      expect(result.data.cap_number).toBe(7);
    }
  });

  it("rejects birth_year outside the [1900, 2100] range", () => {
    expect(
      updateProfileSchema.safeParse({ ...basePayload, birth_year: "1899" }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({ ...basePayload, birth_year: "2101" }).success,
    ).toBe(false);
  });

  it("rejects cap_number out of range", () => {
    expect(
      updateProfileSchema.safeParse({ ...basePayload, cap_number: "-1" }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({ ...basePayload, cap_number: "100" }).success,
    ).toBe(false);
  });

  it("rejects a too-short full_name", () => {
    expect(
      updateProfileSchema.safeParse({ full_name: "A" }).success,
    ).toBe(false);
  });

  it("accepts a valid E.164 phone", () => {
    expect(
      updateProfileSchema.safeParse({
        ...basePayload,
        phone_e164: "+34612345678",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      updateProfileSchema.safeParse({
        ...basePayload,
        email_contact: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("does not include license_active in the schema", () => {
    const result = updateProfileSchema.safeParse({
      ...basePayload,
      license_active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("license_active" in result.data).toBe(false);
    }
  });

  it("differs from updatePlayerSchema: updateProfileSchema rejects empty objects", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });
});

describe("linkSchema and unlinkSchema", () => {
  const validLink = {
    parent_profile_id: "550e8400-e29b-41d4-a716-446655440000",
    child_profile_id: "550e8400-e29b-41d4-a716-446655440001",
    relation: "mother",
  };

  it("accepts a valid link", () => {
    expect(linkSchema.safeParse(validLink).success).toBe(true);
  });

  it("rejects an invalid relation", () => {
    expect(linkSchema.safeParse({ ...validLink, relation: "stepmom" }).success).toBe(false);
  });

  it("accepts unlink without relation", () => {
    expect(unlinkSchema.safeParse(validLink).success).toBe(true);
  });

  it("parentRelationEnum accepts all four values", () => {
    for (const v of ["mother", "father", "legal_guardian", "other"]) {
      expect(parentRelationEnum.safeParse(v).success).toBe(true);
    }
  });
});

describe("roleAssignmentSchema and userRoleEnum", () => {
  it("accepts every documented user role", () => {
    for (const v of ["admin", "coach", "delegate", "directiva", "parent", "player"]) {
      expect(userRoleEnum.safeParse(v).success).toBe(true);
    }
  });

  it("accepts a role with no scope", () => {
    expect(
      roleAssignmentSchema.safeParse({
        profile_id: "550e8400-e29b-41d4-a716-446655440000",
        role: "admin",
      }).success,
    ).toBe(true);
  });

  it("accepts a role with a team scope", () => {
    expect(
      roleAssignmentSchema.safeParse({
        profile_id: "550e8400-e29b-41d4-a716-446655440000",
        role: "coach",
        scope_team_id: "550e8400-e29b-41d4-a716-446655440001",
      }).success,
    ).toBe(true);
  });

  it("accepts an explicit null scope_team_id", () => {
    expect(
      roleAssignmentSchema.safeParse({
        profile_id: "550e8400-e29b-41d4-a716-446655440000",
        role: "admin",
        scope_team_id: null,
      }).success,
    ).toBe(true);
  });
});

describe("xlsxRowSchema", () => {
  it("accepts a minimal valid row", () => {
    expect(
      xlsxRowSchema.safeParse({
        nombre_completo: "Jugador",
        ano_nacimiento: 2015,
      }).success,
    ).toBe(true);
  });

  it("rejects empty nombre_completo", () => {
    expect(
      xlsxRowSchema.safeParse({ nombre_completo: "", ano_nacimiento: 2015 }).success,
    ).toBe(false);
  });

  it("rejects non-numeric ano_nacimiento", () => {
    expect(
      xlsxRowSchema.safeParse({ nombre_completo: "X", ano_nacimiento: "abc" }).success,
    ).toBe(false);
  });

  it("rejects birth_year outside the [1900, 2100] range", () => {
    expect(
      xlsxRowSchema.safeParse({ nombre_completo: "X", ano_nacimiento: 1899 }).success,
    ).toBe(false);
  });

  it("treats empty dorsal as missing (not 0)", () => {
    const result = xlsxRowSchema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
      dorsal: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dorsal).toBeUndefined();
    }
  });

  it("rejects dorsal out of range", () => {
    expect(
      xlsxRowSchema.safeParse({
        nombre_completo: "X",
        ano_nacimiento: 2015,
        dorsal: 100,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid email_tutor", () => {
    expect(
      xlsxRowSchema.safeParse({
        nombre_completo: "X",
        ano_nacimiento: 2015,
        email_tutor: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("defaults relacion to legal_guardian when missing", () => {
    const result = xlsxRowSchema.safeParse({
      nombre_completo: "X",
      ano_nacimiento: 2015,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relacion).toBe("legal_guardian");
    }
  });
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("recomputeRankingSchema", () => {
  const valid = {
    season_id: "550e8400-e29b-41d4-a716-446655440000",
    player_id: "550e8400-e29b-41d4-a716-446655440001",
  };

  it("accepts valid season and player ids", () => {
    expect(recomputeRankingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-UUID season_id", () => {
    expect(
      recomputeRankingSchema.safeParse({ ...valid, season_id: "x" }).success,
    ).toBe(false);
  });

  it("rejects non-UUID player_id", () => {
    expect(
      recomputeRankingSchema.safeParse({ ...valid, player_id: "x" }).success,
    ).toBe(false);
  });
});

describe("unvalidateMatchStatsSchema", () => {
  const valid = {
    match_id: "550e8400-e29b-41d4-a716-446655440000",
    reason: "Resultado mal apuntado",
  };

  it("accepts a valid match_id and a 5+ character reason", () => {
    expect(unvalidateMatchStatsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a too-short reason", () => {
    expect(
      unvalidateMatchStatsSchema.safeParse({ ...valid, reason: "x" }).success,
    ).toBe(false);
  });

  it("rejects a too-long reason", () => {
    expect(
      unvalidateMatchStatsSchema.safeParse({ ...valid, reason: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("trims whitespace from the reason", () => {
    const result = unvalidateMatchStatsSchema.safeParse({
      ...valid,
      reason: "   Resultado mal apuntado   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Resultado mal apuntado");
    }
  });

  it("rejects a non-UUID match_id", () => {
    expect(
      unvalidateMatchStatsSchema.safeParse({ ...valid, match_id: "nope" }).success,
    ).toBe(false);
  });
});

describe("bulkUnvalidateMatchStatsSchema", () => {
  const valid = {
    match_ids: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
    reason: "Validar de nuevo toda la jornada",
  };

  it("accepts a valid list of match ids and a reason", () => {
    expect(bulkUnvalidateMatchStatsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty match_ids array", () => {
    expect(
      bulkUnvalidateMatchStatsSchema.safeParse({ ...valid, match_ids: [] }).success,
    ).toBe(false);
  });

  it("rejects more than 50 match_ids", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, "0")}`);
    expect(
      bulkUnvalidateMatchStatsSchema.safeParse({ ...valid, match_ids: ids }).success,
    ).toBe(false);
  });

  it("rejects when any match_id is not a UUID", () => {
    expect(
      bulkUnvalidateMatchStatsSchema.safeParse({
        ...valid,
        match_ids: ["550e8400-e29b-41d4-a716-446655440000", "not-a-uuid"],
      }).success,
    ).toBe(false);
  });
});

describe("requireAdmin (mocked supabase)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("can be imported and is callable as a function", async () => {
    const helpers = await import("@/server/actions/admin/_helpers");
    expect(typeof helpers.requireAdmin).toBe("function");
  });
});

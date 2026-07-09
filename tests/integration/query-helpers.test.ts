// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const HAS_ENV = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let admin: SupabaseClient<Database> | null = null;

if (HAS_ENV) {
  admin = createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SUFFIX = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PREFIX = `TEST_${SUFFIX}`;

let testSeasonId: string | null = null;
let testTeamId: string | null = null;
let testPlayerId: string | null = null;
let testStaffProfileId: string | null = null;
let testParentProfileId: string | null = null;
let testChildProfileId: string | null = null;

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      getAll: () => [],
      get: () => undefined,
      set: () => undefined,
      has: () => false,
      delete: () => undefined,
    }),
}));

async function deleteTestData(client: SupabaseClient<Database>): Promise<void> {
  if (!testSeasonId) return;

  await client
    .from("team_rosters")
    .delete()
    .eq("team_id", testTeamId ?? "");

  await client
    .from("team_staff")
    .delete()
    .eq("team_id", testTeamId ?? "");

  await client
    .from("teams")
    .delete()
    .eq("id", testTeamId ?? "");

  await client
    .from("parent_child_links")
    .delete()
    .eq("parent_profile_id", testParentProfileId ?? "");

  const idsToDelete = [
    testPlayerId,
    testStaffProfileId,
    testParentProfileId,
    testChildProfileId,
  ].filter((x): x is string => Boolean(x));

  if (idsToDelete.length > 0) {
    await client.from("profiles").delete().in("id", idsToDelete);
  }

  await client.from("seasons").delete().eq("id", testSeasonId);
}

describe.skipIf(!HAS_ENV)("query helpers (integration)", () => {
  beforeAll(async () => {
    if (!admin) return;

    const { data: season } = await admin
      .from("seasons")
      .insert({
        label: `${TEST_PREFIX} season`,
        start_date: "2025-09-01",
        end_date: "2026-07-31",
        is_current: false,
      })
      .select("id")
      .single();
    testSeasonId = season?.id ?? null;

    if (testSeasonId) {
      const { data: team } = await admin
        .from("teams")
        .insert({
          season_id: testSeasonId,
          category_code: "cadete",
          label: `${TEST_PREFIX} team`,
          gender: "male",
        })
        .select("id")
        .single();
      testTeamId = team?.id ?? null;
    }

    const { data: player } = await admin
      .from("profiles")
      .insert({
        full_name: `${TEST_PREFIX} player`,
        birth_year: 2010,
      })
      .select("id")
      .single();
    testPlayerId = player?.id ?? null;

    const { data: staffProfile } = await admin
      .from("profiles")
      .insert({
        full_name: `${TEST_PREFIX} staff`,
        birth_year: 1985,
      })
      .select("id")
      .single();
    testStaffProfileId = staffProfile?.id ?? null;

    const { data: parent } = await admin
      .from("profiles")
      .insert({
        full_name: `${TEST_PREFIX} parent`,
        email_contact: `${TEST_PREFIX.toLowerCase()}-parent@example.com`,
      })
      .select("id")
      .single();
    testParentProfileId = parent?.id ?? null;

    const { data: child } = await admin
      .from("profiles")
      .insert({
        full_name: `${TEST_PREFIX} child`,
        birth_year: 2012,
      })
      .select("id")
      .single();
    testChildProfileId = child?.id ?? null;

    if (testTeamId && testPlayerId) {
      await admin.from("team_rosters").insert({ team_id: testTeamId, player_id: testPlayerId });
    }
    if (testTeamId && testStaffProfileId) {
      await admin.from("team_staff").insert({
        team_id: testTeamId,
        profile_id: testStaffProfileId,
        role: "head_coach",
      });
    }
    if (testParentProfileId && testChildProfileId) {
      await admin.from("parent_child_links").insert({
        parent_profile_id: testParentProfileId,
        child_profile_id: testChildProfileId,
        relation: "mother",
      });
    }
  });

  afterAll(async () => {
    if (!admin) return;
    await deleteTestData(admin);
  });

  it("getCurrentSeason returns the season with is_current=true", async () => {
    const { getCurrentSeason } = await import("@/server/queries/seasons");
    const season = await getCurrentSeason();
    expect(season).not.toBeNull();
    expect(season?.is_current).toBe(true);
    expect(season?.label).toBeTruthy();
  });

  it("getTeamById returns the seeded team", async () => {
    if (!testTeamId) return;
    const { getTeamById } = await import("@/server/queries/teams");
    const team = await getTeamById(testTeamId);
    expect(team).not.toBeNull();
    expect(team?.id).toBe(testTeamId);
    expect(team?.category_code).toBe("cadete");
  });

  it("getTeamRoster returns the seeded player", async () => {
    if (!testTeamId) return;
    const { getTeamRoster } = await import("@/server/queries/teams");
    const roster = await getTeamRoster(testTeamId);
    const found = roster.find((r) => r.player_id === testPlayerId);
    expect(found).toBeDefined();
    expect(found?.full_name).toContain(TEST_PREFIX);
  });

  it("getTeamStaff returns the seeded staff", async () => {
    if (!testTeamId) return;
    const { getTeamStaff } = await import("@/server/queries/teams");
    const staff = await getTeamStaff(testTeamId);
    const found = staff.find((s) => s.profile_id === testStaffProfileId);
    expect(found).toBeDefined();
    expect(found?.role).toBe("head_coach");
  });

  it("getTeamsForProfileInSeason returns the team for a player", async () => {
    if (!testPlayerId || !testSeasonId) return;
    const { getTeamsForProfileInSeason } = await import("@/server/queries/teams");
    const teams = await getTeamsForProfileInSeason(testPlayerId, testSeasonId);
    expect(teams.length).toBeGreaterThanOrEqual(1);
    const found = teams.find((t) => t.id === testTeamId);
    expect(found).toBeDefined();
    expect(found?.player_count).toBeGreaterThanOrEqual(1);
  });

  it("getTeamsForProfileInSeason returns the team for a staff member", async () => {
    if (!testStaffProfileId || !testSeasonId) return;
    const { getTeamsForProfileInSeason } = await import("@/server/queries/teams");
    const teams = await getTeamsForProfileInSeason(testStaffProfileId, testSeasonId);
    const found = teams.find((t) => t.id === testTeamId);
    expect(found).toBeDefined();
  });

  it("getActiveProfileContext returns own profile when no cookie (and auth fails for service role)", async () => {
    const { getActiveProfileContext } = await import("@/server/queries/active-profile");
    const ctx = await getActiveProfileContext();
    expect(ctx).toBeNull();
  });

  it("isProfileStaffInSeason returns true for the seeded staff", async () => {
    if (!testStaffProfileId || !testSeasonId) return;
    const { isProfileStaffInSeason } = await import("@/server/queries/teams");
    const result = await isProfileStaffInSeason(testStaffProfileId, testSeasonId);
    expect(result).toBe(true);
  });

  it("isProfilePlayerInSeason returns true for the seeded player", async () => {
    if (!testPlayerId || !testSeasonId) return;
    const { isProfilePlayerInSeason } = await import("@/server/queries/teams");
    const result = await isProfilePlayerInSeason(testPlayerId, testSeasonId);
    expect(result).toBe(true);
  });
});

describe.skipIf(HAS_ENV)("query helpers (env required)", () => {
  it("is skipped when env vars are not set", () => {
    expect(HAS_ENV).toBe(false);
  });
});

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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const PASSWORD = "Test123456!";

let admin: SupabaseClient<Database> | null = null;
let adminAnon: SupabaseClient<Database> | null = null;
let regularAnon: SupabaseClient<Database> | null = null;
let parentAnon: SupabaseClient<Database> | null = null;
let unrelatedAnon: SupabaseClient<Database> | null = null;

const SUFFIX = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PREFIX = `RLS_TEST_${SUFFIX}`;

let adminAuthUserId: string | null = null;
let regularAuthUserId: string | null = null;
let parentAuthUserId: string | null = null;
let unrelatedAuthUserId: string | null = null;
let adminProfileId: string | null = null;
let regularProfileId: string | null = null;
let parentProfileId: string | null = null;
let childProfileId: string | null = null;
let unrelatedProfileId: string | null = null;
let testSeasonId: string | null = null;
let testTeamId: string | null = null;

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

async function createAuthUser(client: SupabaseClient<Database>, email: string): Promise<string> {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? "no user"}`);
  }
  return data.user.id;
}

async function deleteAuthUser(client: SupabaseClient<Database>, userId: string): Promise<void> {
  await client.auth.admin.deleteUser(userId);
}

async function cleanupTestData(): Promise<void> {
  if (!admin) return;

  if (testTeamId) {
    await admin.from("team_rosters").delete().eq("team_id", testTeamId);
    await admin.from("team_staff").delete().eq("team_id", testTeamId);
    await admin.from("teams").delete().eq("id", testTeamId);
  }
  if (testSeasonId) {
    await admin.from("seasons").delete().eq("id", testSeasonId);
  }
  if (parentProfileId && childProfileId) {
    await admin
      .from("parent_child_links")
      .delete()
      .eq("parent_profile_id", parentProfileId)
      .eq("child_profile_id", childProfileId);
  }

  const profileIds = [
    adminProfileId,
    regularProfileId,
    parentProfileId,
    childProfileId,
    unrelatedProfileId,
  ].filter((x): x is string => Boolean(x));
  if (profileIds.length > 0) {
    await admin.from("user_roles").delete().in("profile_id", profileIds);
    await admin.from("profiles").delete().in("id", profileIds);
  }

  for (const userId of [
    adminAuthUserId,
    regularAuthUserId,
    parentAuthUserId,
    unrelatedAuthUserId,
  ]) {
    if (userId) {
      try {
        await deleteAuthUser(admin, userId);
      } catch {
        // ignore
      }
    }
  }
}

describe.skipIf(!HAS_ENV)("RLS policies (integration)", () => {
  beforeAll(async () => {
    if (!HAS_ENV) return;

    admin = createClient<Database>(URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    adminAuthUserId = await createAuthUser(admin, `${TEST_PREFIX}-admin@test.local`);
    regularAuthUserId = await createAuthUser(admin, `${TEST_PREFIX}-regular@test.local`);
    parentAuthUserId = await createAuthUser(admin, `${TEST_PREFIX}-parent@test.local`);
    unrelatedAuthUserId = await createAuthUser(admin, `${TEST_PREFIX}-unrelated@test.local`);

    const { data: adminProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: adminAuthUserId,
        full_name: `${TEST_PREFIX} Admin`,
        email_contact: `${TEST_PREFIX}-admin@test.local`,
      })
      .select("id")
      .single();
    adminProfileId = adminProfile?.id ?? null;

    if (adminProfileId) {
      await admin.from("user_roles").insert({
        profile_id: adminProfileId,
        role: "admin",
        scope_team_id: null,
      });
    }

    const { data: regularProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: regularAuthUserId,
        full_name: `${TEST_PREFIX} Regular`,
        email_contact: `${TEST_PREFIX}-regular@test.local`,
        phone_e164: "+34600000001",
      })
      .select("id")
      .single();
    regularProfileId = regularProfile?.id ?? null;

    const { data: parentProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: parentAuthUserId,
        full_name: `${TEST_PREFIX} Parent`,
        email_contact: `${TEST_PREFIX}-parent@test.local`,
        phone_e164: "+34600000002",
      })
      .select("id")
      .single();
    parentProfileId = parentProfile?.id ?? null;

    const { data: childProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: null,
        full_name: `${TEST_PREFIX} Child`,
        birth_year: 2014,
        phone_e164: "+34600000003",
      })
      .select("id")
      .single();
    childProfileId = childProfile?.id ?? null;

    const { data: unrelatedProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: unrelatedAuthUserId,
        full_name: `${TEST_PREFIX} Unrelated`,
        email_contact: `${TEST_PREFIX}-unrelated@test.local`,
      })
      .select("id")
      .single();
    unrelatedProfileId = unrelatedProfile?.id ?? null;

    if (parentProfileId && childProfileId) {
      await admin.from("parent_child_links").insert({
        parent_profile_id: parentProfileId,
        child_profile_id: childProfileId,
        relation: "mother",
      });
    }

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

    if (testSeasonId && adminProfileId) {
      const { data: team } = await admin
        .from("teams")
        .insert({
          season_id: testSeasonId,
          category_code: "alevin",
          label: `${TEST_PREFIX} team`,
          gender: "mixed",
        })
        .select("id")
        .single();
      testTeamId = team?.id ?? null;

      if (testTeamId && adminProfileId) {
        await admin.from("team_staff").insert({
          team_id: testTeamId,
          profile_id: adminProfileId,
          role: "head_coach",
        });
        if (childProfileId) {
          await admin.from("team_rosters").insert({
            team_id: testTeamId,
            player_id: childProfileId,
          });
        }
      }
    }

    adminAnon = createClient<Database>(URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    regularAnon = createClient<Database>(URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    parentAnon = createClient<Database>(URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    unrelatedAnon = createClient<Database>(URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await adminAnon.auth.signInWithPassword({
      email: `${TEST_PREFIX}-admin@test.local`,
      password: PASSWORD,
    });
    await regularAnon.auth.signInWithPassword({
      email: `${TEST_PREFIX}-regular@test.local`,
      password: PASSWORD,
    });
    await parentAnon.auth.signInWithPassword({
      email: `${TEST_PREFIX}-parent@test.local`,
      password: PASSWORD,
    });
    await unrelatedAnon.auth.signInWithPassword({
      email: `${TEST_PREFIX}-unrelated@test.local`,
      password: PASSWORD,
    });
  });

  afterAll(async () => {
    if (admin) {
      await cleanupTestData();
    }
  });

  it("regular user can SELECT their own profile row", async () => {
    if (!regularAnon || !regularProfileId) return;
    const { data, error } = await regularAnon
      .from("profiles")
      .select("id, full_name, phone_e164, email_contact")
      .eq("id", regularProfileId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(regularProfileId);
  });

  it("regular user CANNOT SELECT another user's private row", async () => {
    if (!regularAnon || !childProfileId) return;
    const { data, error } = await regularAnon
      .from("profiles")
      .select("id, full_name, phone_e164, email_contact")
      .eq("id", childProfileId)
      .maybeSingle();
    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it("parent CAN SELECT their own child's row", async () => {
    if (!parentAnon || !childProfileId) return;
    const { data, error } = await parentAnon
      .from("profiles")
      .select("id, full_name, phone_e164, email_contact")
      .eq("id", childProfileId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(childProfileId);
  });

  it("unrelated user CANNOT SELECT another user's private row", async () => {
    if (!unrelatedAnon || !regularProfileId) return;
    const { data } = await unrelatedAnon
      .from("profiles")
      .select("id, full_name, phone_e164, email_contact")
      .eq("id", regularProfileId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("profiles_public view exposes public columns for any authenticated user", async () => {
    if (!unrelatedAnon || !regularProfileId) return;
    const { data, error } = await unrelatedAnon
      .from("profiles_public")
      .select("id, full_name, birth_year, cap_number, license_active")
      .eq("id", regularProfileId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(regularProfileId);
  });

  it("profiles_public view does NOT expose private columns (phone/email)", async () => {
    if (!unrelatedAnon || !regularProfileId) return;
    const { data } = await unrelatedAnon
      .from("profiles_public")
      .select("*")
      .eq("id", regularProfileId)
      .maybeSingle();
    expect(data).not.toBeNull();
    const record = data as Record<string, unknown> | null;
    expect(record).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(record, "phone_e164")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(record, "email_contact")).toBe(false);
  });

  it("all authenticated users can SELECT from seasons", async () => {
    if (!regularAnon || !testSeasonId) return;
    const { data, error } = await regularAnon
      .from("seasons")
      .select("id, label, start_date, end_date")
      .eq("id", testSeasonId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("all authenticated users can SELECT from teams", async () => {
    if (!regularAnon || !testTeamId) return;
    const { data, error } = await regularAnon
      .from("teams")
      .select("id, label, category_code")
      .eq("id", testTeamId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("all authenticated users can SELECT from team_staff", async () => {
    if (!regularAnon || !testTeamId) return;
    const { data, error } = await regularAnon
      .from("team_staff")
      .select("team_id, profile_id, role")
      .eq("team_id", testTeamId);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("all authenticated users can SELECT from team_rosters", async () => {
    if (!regularAnon || !testTeamId) return;
    const { data, error } = await regularAnon
      .from("team_rosters")
      .select("team_id, player_id")
      .eq("team_id", testTeamId);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("non-admin CANNOT INSERT into seasons", async () => {
    if (!regularAnon) return;
    const { error } = await regularAnon.from("seasons").insert({
      label: `${TEST_PREFIX} should-not-insert`,
      start_date: "2025-09-01",
      end_date: "2026-07-31",
    });
    expect(error).not.toBeNull();
  });

  it("non-admin CANNOT INSERT into teams", async () => {
    if (!regularAnon || !testSeasonId) return;
    const { error } = await regularAnon.from("teams").insert({
      season_id: testSeasonId,
      category_code: "infantil",
      label: `${TEST_PREFIX} should-not-insert`,
      gender: "mixed",
    });
    expect(error).not.toBeNull();
  });

  it("non-admin CANNOT INSERT into team_rosters", async () => {
    if (!regularAnon || !testTeamId) return;
    const { error } = await regularAnon.from("team_rosters").insert({
      team_id: testTeamId,
      player_id: regularProfileId ?? childProfileId ?? "",
    });
    expect(error).not.toBeNull();
  });
});

describe.skipIf(HAS_ENV)("RLS policies (env required)", () => {
  it("is skipped when env vars are not set", () => {
    expect(HAS_ENV).toBe(false);
  });
});

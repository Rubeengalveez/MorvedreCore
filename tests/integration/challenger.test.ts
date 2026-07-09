// @vitest-environment node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

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
let coachAnon: SupabaseClient<Database> | null = null;
let delegateAnon: SupabaseClient<Database> | null = null;

const SUFFIX = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PREFIX = `CHALLENGE_TEST_${SUFFIX}`;

let coachAuthUserId: string | null = null;
let delegateAuthUserId: string | null = null;
let coachProfileId: string | null = null;
let delegateProfileId: string | null = null;
let playerProfileId: string | null = null;

let testSeasonId: string | null = null;
let testTeamId: string | null = null;
let matchId: string | null = null;
let trainingSessionId: string | null = null;

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

  if (matchId) {
    await admin.from("match_stats").delete().eq("match_id", matchId);
    await admin.from("matches").delete().eq("id", matchId);
  }
  if (trainingSessionId) {
    await admin.from("training_sessions").delete().eq("id", trainingSessionId);
  }
  if (testTeamId) {
    await admin.from("team_rosters").delete().eq("team_id", testTeamId);
    await admin.from("team_staff").delete().eq("team_id", testTeamId);
    await admin.from("teams").delete().eq("id", testTeamId);
  }
  if (testSeasonId) {
    await admin.from("seasons").delete().eq("id", testSeasonId);
  }

  const profileIds = [coachProfileId, delegateProfileId, playerProfileId].filter((x): x is string =>
    Boolean(x),
  );
  if (profileIds.length > 0) {
    await admin.from("user_roles").delete().in("profile_id", profileIds);
    await admin.from("profiles").delete().in("id", profileIds);
  }

  for (const userId of [coachAuthUserId, delegateAuthUserId]) {
    if (userId) {
      try {
        await deleteAuthUser(admin, userId);
      } catch {
        // ignore
      }
    }
  }
}

describe.skipIf(!HAS_ENV)("Challenger Tests (integration)", () => {
  beforeAll(async () => {
    if (!HAS_ENV) return;

    admin = createClient<Database>(URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    coachAuthUserId = await createAuthUser(admin, `${TEST_PREFIX.toLowerCase()}-coach@test.local`);
    delegateAuthUserId = await createAuthUser(
      admin,
      `${TEST_PREFIX.toLowerCase()}-delegate@test.local`,
    );

    // Insert profiles
    const { data: coachProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: coachAuthUserId,
        full_name: `${TEST_PREFIX} Coach`,
        email_contact: `${TEST_PREFIX.toLowerCase()}-coach@test.local`,
      })
      .select("id")
      .single();
    coachProfileId = coachProfile?.id ?? null;

    const { data: delegateProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: delegateAuthUserId,
        full_name: `${TEST_PREFIX} Delegate`,
        email_contact: `${TEST_PREFIX.toLowerCase()}-delegate@test.local`,
      })
      .select("id")
      .single();
    delegateProfileId = delegateProfile?.id ?? null;

    const { data: playerProfile } = await admin
      .from("profiles")
      .insert({
        auth_user_id: null,
        full_name: `${TEST_PREFIX} Player`,
        birth_year: 2010,
      })
      .select("id")
      .single();
    playerProfileId = playerProfile?.id ?? null;

    // Create season and team
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

    // Assign roles in user_roles and staff/roster
    if (testTeamId && coachProfileId && delegateProfileId && playerProfileId) {
      await admin.from("user_roles").insert([
        {
          profile_id: coachProfileId,
          role: "coach",
          scope_team_id: testTeamId,
        },
        {
          profile_id: delegateProfileId,
          role: "delegate",
          scope_team_id: testTeamId,
        },
      ]);

      await admin.from("team_staff").insert([
        {
          team_id: testTeamId,
          profile_id: coachProfileId,
          role: "head_coach",
        },
        {
          team_id: testTeamId,
          profile_id: delegateProfileId,
          role: "delegate",
        },
      ]);

      await admin.from("team_rosters").insert({
        team_id: testTeamId,
        player_id: playerProfileId,
      });
    }

    // Log in clients
    coachAnon = createClient<Database>(URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    delegateAnon = createClient<Database>(URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await coachAnon.auth.signInWithPassword({
      email: `${TEST_PREFIX.toLowerCase()}-coach@test.local`,
      password: PASSWORD,
    });
    await delegateAnon.auth.signInWithPassword({
      email: `${TEST_PREFIX.toLowerCase()}-delegate@test.local`,
      password: PASSWORD,
    });
  });

  afterAll(async () => {
    if (admin) {
      await cleanupTestData();
    }
  });

  describe("training_sessions_sync_end_at trigger", () => {
    it("correctly syncs end times when scheduled_at and duration are updated", async () => {
      if (!admin || !testTeamId) return;

      // 1. Insert session with null end_at
      const scheduledAt1 = "2026-07-01T10:00:00.000Z";
      const duration1 = 90;
      const expectedEnd1 = "2026-07-01T11:30:00.000Z";

      const { data: inserted, error: err1 } = await admin
        .from("training_sessions")
        .insert({
          team_id: testTeamId,
          scheduled_at: scheduledAt1,
          duration_minutes: duration1,
          end_at: null,
        })
        .select("*")
        .single();

      expect(err1).toBeNull();
      expect(inserted).not.toBeNull();
      if (!inserted) throw new Error("inserted is null");
      if (!inserted.end_at) throw new Error("inserted.end_at is null");
      trainingSessionId = inserted.id;

      // Check if inserted end_at was automatically computed
      expect(new Date(inserted.end_at).toISOString()).toBe(new Date(expectedEnd1).toISOString());

      // 2. Update scheduled_at only (keep duration same)
      const scheduledAt2 = "2026-07-01T12:00:00.000Z";
      const expectedEnd2 = "2026-07-01T13:30:00.000Z";

      const { data: updated1, error: err2 } = await admin
        .from("training_sessions")
        .update({
          scheduled_at: scheduledAt2,
        })
        .eq("id", trainingSessionId)
        .select("*")
        .single();

      expect(err2).toBeNull();
      expect(updated1).not.toBeNull();
      if (!updated1) throw new Error("updated1 is null");
      if (!updated1.end_at) throw new Error("updated1.end_at is null");
      expect(new Date(updated1.end_at).toISOString()).toBe(new Date(expectedEnd2).toISOString());

      // 3. Update both scheduled_at and duration
      const scheduledAt3 = "2026-07-01T14:00:00.000Z";
      const duration3 = 60;
      const expectedEnd3 = "2026-07-01T15:00:00.000Z";

      const { data: updated2, error: err3 } = await admin
        .from("training_sessions")
        .update({
          scheduled_at: scheduledAt3,
          duration_minutes: duration3,
        })
        .eq("id", trainingSessionId)
        .select("*")
        .single();

      expect(err3).toBeNull();
      expect(updated2).not.toBeNull();
      if (!updated2) throw new Error("updated2 is null");
      if (!updated2.end_at) throw new Error("updated2.end_at is null");
      expect(new Date(updated2.end_at).toISOString()).toBe(new Date(expectedEnd3).toISOString());

      // 4. Update duration only
      const duration4 = 120;
      const expectedEnd4 = "2026-07-01T16:00:00.000Z";

      const { data: updated3, error: err4 } = await admin
        .from("training_sessions")
        .update({
          duration_minutes: duration4,
        })
        .eq("id", trainingSessionId)
        .select("*")
        .single();

      expect(err4).toBeNull();
      expect(updated3).not.toBeNull();
      if (!updated3) throw new Error("updated3 is null");
      if (!updated3.end_at) throw new Error("updated3.end_at is null");
      expect(new Date(updated3.end_at).toISOString()).toBe(new Date(expectedEnd4).toISOString());

      // 5. Update scheduled_at but explicitly pass a custom non-null end_at
      const scheduledAt5 = "2026-07-01T15:00:00.000Z";
      const customEnd = "2026-07-01T18:00:00.000Z"; // 3 hours later, not 2 hours (120 minutes)

      const { data: updated4, error: err5 } = await admin
        .from("training_sessions")
        .update({
          scheduled_at: scheduledAt5,
          end_at: customEnd,
        })
        .eq("id", trainingSessionId)
        .select("*")
        .single();

      expect(err5).toBeNull();
      expect(updated4).not.toBeNull();
      if (!updated4) throw new Error("updated4 is null");
      if (!updated4.end_at) throw new Error("updated4.end_at is null");
      expect(new Date(updated4.end_at).toISOString()).toBe(new Date(customEnd).toISOString());
    });
  });

  describe("match_stats validation lock bypass prevention", () => {
    it("prevents coach and delegate from bypassing validation lock by setting validated_at to null", async () => {
      if (!admin || !testSeasonId || !testTeamId || !playerProfileId) return;

      // 1. Create a match using admin
      const { data: match, error: matchErr } = await admin
        .from("matches")
        .insert({
          season_id: testSeasonId,
          team_id: testTeamId,
          opponent: `${TEST_PREFIX} Opponent`,
          scheduled_at: "2026-07-01T18:00:00.000Z",
          competition_type: "league",
          is_home: true,
          status: "scheduled",
        })
        .select("id")
        .single();

      expect(matchErr).toBeNull();
      expect(match).not.toBeNull();
      if (!match) throw new Error("match is null");
      matchId = match.id;

      // 2. Insert initial match_stats as admin
      const { data: stats, error: statsErr } = await admin
        .from("match_stats")
        .insert({
          match_id: matchId,
          player_id: playerProfileId,
          goals: 1,
          exclusions: 0,
          mvp: false,
          validated_at: null,
          validated_by: null,
        })
        .select("*")
        .single();

      expect(statsErr).toBeNull();
      expect(stats).not.toBeNull();

      // 3. Coach updates match_stats (should succeed because validated_at is null)
      const { data: coachUpdate1, error: coachErr1 } = await coachAnon!
        .from("match_stats")
        .update({ goals: 2 })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*")
        .single();

      expect(coachErr1).toBeNull();
      expect(coachUpdate1?.goals).toBe(2);

      // 4. Delegate updates match_stats (should succeed because validated_at and validated_by are null)
      const { data: delegateUpdate1, error: delegateErr1 } = await delegateAnon!
        .from("match_stats")
        .update({ exclusions: 1 })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*")
        .single();

      expect(delegateErr1).toBeNull();
      expect(delegateUpdate1?.exclusions).toBe(1);

      // 5. Admin validates the match_stats
      const { data: validatedStats, error: valErr } = await admin
        .from("match_stats")
        .update({
          validated_at: new Date().toISOString(),
          validated_by: coachProfileId, // just using an existing profile ID for validated_by
        })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*")
        .single();

      expect(valErr).toBeNull();
      if (!validatedStats) throw new Error("validatedStats is null");
      expect(validatedStats.validated_at).not.toBeNull();

      // 6. Coach tries to update goals without changing validated_at (should fail/affect 0 rows due to RLS)
      const { data: coachUpdateFail } = await coachAnon!
        .from("match_stats")
        .update({ goals: 5 })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*");

      expect(coachUpdateFail?.length ?? 0).toBe(0);

      // 7. Coach tries to update goals and bypass lock by setting validated_at to null
      const { data: coachBypassAttempt } = await coachAnon!
        .from("match_stats")
        .update({ goals: 6, validated_at: null })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*");

      expect(coachBypassAttempt?.length ?? 0).toBe(0);

      // 8. Delegate tries to update exclusions without changing validated_at
      const { data: delegateUpdateFail } = await delegateAnon!
        .from("match_stats")
        .update({ exclusions: 2 })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*");

      expect(delegateUpdateFail?.length ?? 0).toBe(0);

      // 9. Delegate tries to update exclusions and bypass lock by setting validated_at to null
      const { data: delegateBypassAttempt } = await delegateAnon!
        .from("match_stats")
        .update({ exclusions: 3, validated_at: null })
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .select("*");

      expect(delegateBypassAttempt?.length ?? 0).toBe(0);

      // Double check that database value remained unchanged (goals = 2, exclusions = 1)
      const { data: finalStats } = await admin
        .from("match_stats")
        .select("*")
        .eq("match_id", matchId)
        .eq("player_id", playerProfileId)
        .single();

      if (!finalStats) throw new Error("finalStats is null");
      expect(finalStats.goals).toBe(2);
      expect(finalStats.exclusions).toBe(1);
      expect(finalStats.validated_at).not.toBeNull();
    });
  });
});

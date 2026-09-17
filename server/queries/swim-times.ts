import "server-only";

import { createClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all-rows";
import {
  computeSwimLegends,
  computeSwimRanking,
  type SwimDistance,
  type SwimRankingMode,
  type SwimTimeEntryInput,
} from "@/lib/domain/swim-times";
import type { CategoryCode } from "@/lib/domain/categories";
import type { Tables } from "@/types/database";

type SwimTimeRow = Tables<"swim_time_entries">;
type SwimProfileRow = Pick<
  Tables<"profiles_public">,
  "id" | "full_name" | "photo_url" | "birth_year"
>;
type SwimTeamRow = Pick<Tables<"teams">, "id" | "label" | "color" | "category_code">;
type SwimSeasonRow = Pick<Tables<"seasons">, "id" | "label" | "end_date">;

export async function getSwimCoachTeamIds(profileId: string): Promise<string[]> {
  const supabase = await createClient();
  const [roleResult, staffResult] = await Promise.all([
    supabase
      .from("user_roles")
      .select("scope_team_id")
      .eq("profile_id", profileId)
      .eq("role", "coach")
      .not("scope_team_id", "is", null),
    supabase
      .from("team_staff")
      .select("team_id")
      .eq("profile_id", profileId)
      .in("role", ["head_coach", "assistant_coach"]),
  ]);
  if (roleResult.error || staffResult.error) return [];
  const teamIds = new Set<string>();
  for (const row of roleResult.data ?? []) {
    if (row.scope_team_id) teamIds.add(row.scope_team_id);
  }
  for (const row of staffResult.data ?? []) teamIds.add(row.team_id);
  return [...teamIds];
}

export async function getSwimTimeEntries(filters?: {
  playerId?: string;
  teamId?: string;
  seasonId?: string;
  includeVoided?: boolean;
}): Promise<SwimTimeEntryInput[]> {
  const supabase = await createClient();
  let rows: SwimTimeRow[] = [];
  try {
    rows = await readAllRows<SwimTimeRow>("los tiempos de nado", (from, to) => {
      let query = supabase
        .from("swim_time_entries")
        .select("*", { count: "exact" })
        .order("id", { ascending: true });
      if (filters?.playerId) query = query.eq("player_id", filters.playerId);
      if (filters?.teamId) query = query.eq("team_id", filters.teamId);
      if (filters?.seasonId) query = query.eq("season_id", filters.seasonId);
      if (!filters?.includeVoided) query = query.is("voided_at", null);
      return query.range(from, to);
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("public.swim_time_entries") ||
        error.message.includes("schema cache"))
    ) {
      console.warn(
        "[swim-times] La tabla public.swim_time_entries no está disponible en Supabase. Aplica la migración 20260914120358_swim_times.sql en el SQL Editor.",
      );
      return [];
    }
    throw error;
  }
  if (rows.length === 0) return [];

  const playerIds = Array.from(new Set(rows.map((row) => row.player_id)));
  const teamIds = Array.from(new Set(rows.map((row) => row.team_id)));
  const seasonIds = Array.from(new Set(rows.map((row) => row.season_id)));
  const [profilesResult, teamsResult, seasonsResult] = await Promise.all([
    supabase
      .from("profiles_public")
      .select("id, full_name, photo_url, birth_year")
      .in("id", playerIds),
    supabase.from("teams").select("id, label, color, category_code").in("id", teamIds),
    supabase.from("seasons").select("id, label, end_date").in("id", seasonIds),
  ]);
  if (profilesResult.error || teamsResult.error || seasonsResult.error) {
    throw new Error("No pudimos completar los tiempos de nado.");
  }

  const profiles = new Map<string, SwimProfileRow>();
  for (const row of profilesResult.data ?? []) {
    if (row.id) profiles.set(row.id, row);
  }
  const teams = new Map<string, SwimTeamRow>();
  for (const row of teamsResult.data ?? []) teams.set(row.id, row);
  const seasons = new Map<string, SwimSeasonRow>();
  for (const row of seasonsResult.data ?? []) seasons.set(row.id, row);

  return rows.flatMap((row) => {
    const profile = profiles.get(row.player_id);
    const team = teams.get(row.team_id);
    const season = seasons.get(row.season_id);
    if (!profile || !team || !season) return [];
    return [
      {
        id: row.id,
        revision: row.revision,
        player_id: row.player_id,
        full_name: profile.full_name ?? "Sin nombre",
        photo_url: profile.photo_url,
        birth_year: profile.birth_year,
        team_id: row.team_id,
        team_label: team.label,
        team_color: team.color,
        team_category: team.category_code as CategoryCode,
        season_id: row.season_id,
        season_label: season.label,
        season_end_year: Number(season.end_date.slice(0, 4)),
        test_date: row.test_date,
        created_at: row.created_at,
        time_50_cs: row.time_50_cs,
        time_100_cs: row.time_100_cs,
      },
    ];
  });
}

export async function getPlayerSwimHistory(playerId: string) {
  const supabase = await createClient();
  const [profileResult, rosterResult, entries] = await Promise.all([
    supabase
      .from("profiles_public")
      .select("id, full_name, photo_url, birth_year")
      .eq("id", playerId)
      .maybeSingle(),
    supabase
      .from("team_rosters")
      .select("team_id")
      .eq("player_id", playerId)
      .is("left_at", null),
    getSwimTimeEntries({ playerId, includeVoided: true }),
  ]);
  if (profileResult.error || !profileResult.data) return null;
  const recent = [...entries].sort((a, b) => {
    const date = b.test_date.localeCompare(a.test_date);
    return date || b.created_at.localeCompare(a.created_at);
  });
  const latest50 = recent.find((row) => row.time_50_cs != null) ?? null;
  const latest100 = recent.find((row) => row.time_100_cs != null) ?? null;
  const best50 =
    [...entries]
      .filter((row) => row.time_50_cs != null)
      .sort((a, b) => a.time_50_cs! - b.time_50_cs! || a.test_date.localeCompare(b.test_date))[0] ??
    null;
  const best100 =
    [...entries]
      .filter((row) => row.time_100_cs != null)
      .sort(
        (a, b) => a.time_100_cs! - b.time_100_cs! || a.test_date.localeCompare(b.test_date),
      )[0] ?? null;
  const currentTeamIds = rosterResult.error
    ? []
    : (rosterResult.data ?? []).map((row) => row.team_id);
  return {
    profile: profileResult.data,
    currentTeamIds,
    entries: recent,
    latest50,
    latest100,
    best50,
    best100,
  };
}

export async function getSwimRanking(input: {
  seasonId: string;
  distance: SwimDistance;
  mode: SwimRankingMode;
  category?: CategoryCode | null;
  teamId?: string | null;
}) {
  const entries = await getSwimTimeEntries({ seasonId: input.seasonId });
  return computeSwimRanking({
    entries,
    distance: input.distance,
    mode: input.mode,
    category: input.category,
    teamId: input.teamId,
  });
}

export async function getSwimLegends(input: {
  distance: SwimDistance;
  category?: CategoryCode | null;
}) {
  const entries = await getSwimTimeEntries();
  return computeSwimLegends({ entries, ...input });
}

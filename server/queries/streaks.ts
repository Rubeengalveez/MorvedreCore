import { createClient } from "@/lib/supabase/server";
import type { StreakType } from "@/lib/domain/streaks";

export interface ActiveStreakRow {
  type: StreakType;
  subject_type: "player" | "team";
  subject_id: string;
  current_value: number;
  best_value: number;
  best_at: string | null;
  last_event_at: string | null;
}

export async function getStreaksForPlayer(
  seasonId: string,
  playerId: string,
): Promise<ActiveStreakRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select("streak_type, subject_type, subject_id, current_value, best_value, best_at, last_event_at")
    .eq("season_id", seasonId)
    .eq("subject_type", "player")
    .eq("subject_id", playerId)
    .order("current_value", { ascending: false });
  return ((data ?? []) as Array<{
    streak_type: string;
    subject_type: string;
    subject_id: string;
    current_value: number;
    best_value: number;
    best_at: string | null;
    last_event_at: string | null;
  }>).map((r) => ({
    type: r.streak_type as StreakType,
    subject_type: "player",
    subject_id: r.subject_id,
    current_value: Number(r.current_value),
    best_value: Number(r.best_value),
    best_at: r.best_at,
    last_event_at: r.last_event_at,
  }));
}

export async function getStreakForTeam(
  seasonId: string,
  teamId: string,
  type: StreakType,
): Promise<ActiveStreakRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select("streak_type, subject_type, subject_id, current_value, best_value, best_at, last_event_at")
    .eq("season_id", seasonId)
    .eq("subject_type", "team")
    .eq("subject_id", teamId)
    .eq("streak_type", type)
    .maybeSingle();
  if (!data) return null;
  const r = data as {
    streak_type: string;
    subject_type: string;
    subject_id: string;
    current_value: number;
    best_value: number;
    best_at: string | null;
    last_event_at: string | null;
  };
  return {
    type: r.streak_type as StreakType,
    subject_type: "team",
    subject_id: r.subject_id,
    current_value: Number(r.current_value),
    best_value: Number(r.best_value),
    best_at: r.best_at,
    last_event_at: r.last_event_at,
  };
}

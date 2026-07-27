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

type StreakDatabaseRow = {
  streak_type: string;
  subject_type: string;
  subject_id: string;
  current_value: number;
  best_value: number;
  best_at: string | null;
  last_event_at: string | null;
};

function toActiveStreak(row: StreakDatabaseRow): ActiveStreakRow {
  return {
    type: row.streak_type as StreakType,
    subject_type: row.subject_type === "team" ? "team" : "player",
    subject_id: row.subject_id,
    current_value: Number(row.current_value),
    best_value: Number(row.best_value),
    best_at: row.best_at,
    last_event_at: row.last_event_at,
  };
}

export async function getStreaksForPlayer(
  seasonId: string,
  playerId: string,
): Promise<ActiveStreakRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select(
      "streak_type, subject_type, subject_id, current_value, best_value, best_at, last_event_at",
    )
    .eq("season_id", seasonId)
    .eq("subject_type", "player")
    .eq("subject_id", playerId)
    .order("current_value", { ascending: false });
  return ((data ?? []) as StreakDatabaseRow[]).map(toActiveStreak);
}

export async function getStreaksForPlayers(
  seasonId: string,
  playerIds: string[],
): Promise<ActiveStreakRow[]> {
  if (playerIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("streaks")
    .select(
      "streak_type, subject_type, subject_id, current_value, best_value, best_at, last_event_at",
    )
    .eq("season_id", seasonId)
    .eq("subject_type", "player")
    .in("subject_id", playerIds)
    .order("current_value", { ascending: false });

  if (error) throw new Error("No pudimos cargar tus rachas.");
  return ((data ?? []) as StreakDatabaseRow[]).map(toActiveStreak);
}

export async function getStreakForTeam(
  seasonId: string,
  teamId: string,
  type: StreakType,
): Promise<ActiveStreakRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select(
      "streak_type, subject_type, subject_id, current_value, best_value, best_at, last_event_at",
    )
    .eq("season_id", seasonId)
    .eq("subject_type", "team")
    .eq("subject_id", teamId)
    .eq("streak_type", type)
    .maybeSingle();
  if (!data) return null;
  return toActiveStreak(data as StreakDatabaseRow);
}

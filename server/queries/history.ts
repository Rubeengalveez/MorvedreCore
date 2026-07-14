import { createClient } from "@/lib/supabase/server";
import { computeLegends, type LegendMetric, type LegendStatInput } from "@/lib/domain/history";
import { getCurrentSeason } from "@/server/queries/seasons";

export async function getClubHistory(metric: LegendMetric) {
  const supabase = await createClient();
  const historyPlayersPromise = supabase.from("historical_player_stats").select("*");
  const profilesPromise = supabase.from("profiles_public").select("id, full_name, photo_url");
  const currentSeasonPromise = getCurrentSeason();

  const [historyPlayersResult, profilesResult, currentSeason] = await Promise.all([
    historyPlayersPromise,
    profilesPromise,
    currentSeasonPromise,
  ]);

  if (historyPlayersResult.error || profilesResult.error) {
    throw new Error("No pudimos cargar el histórico del club.");
  }

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const historicalPlayers: LegendStatInput[] = (historyPlayersResult.data ?? []).map((row) => ({
    profile_id: row.profile_id,
    profile_name: row.profile_name,
    photo_url: profiles.get(row.profile_id)?.photo_url ?? null,
    season_id: row.season_id,
    matches_played: row.matches_played,
    matches_called: row.matches_called,
    goals: row.goals,
    exclusions: row.exclusions,
    trainings_attended: row.trainings_attended,
    trainings_total: row.trainings_total,
    mvp_count: row.mvp_count,
  }));

  if (!currentSeason) {
    return {
      legends: computeLegends(historicalPlayers, metric),
      archivedSeasons: new Set(historicalPlayers.map((row) => row.season_id)).size,
      currentSeasonLabel: null,
    };
  }

  const snapshotsResult = await supabase
    .from("ranking_snapshots")
    .select("*")
    .eq("season_id", currentSeason.id)
    .eq("scope", "season")
    .eq("scope_key", "all");

  if (snapshotsResult.error) {
    throw new Error("No pudimos completar el histórico con la temporada actual.");
  }

  const currentPlayers: LegendStatInput[] = (snapshotsResult.data ?? []).map((row) => {
    const profile = profiles.get(row.player_id);
    return {
      profile_id: row.player_id,
      profile_name: profile?.full_name ?? "Jugador",
      photo_url: profile?.photo_url ?? null,
      season_id: row.season_id,
      matches_played: row.matches_played,
      matches_called: row.matches_called,
      goals: row.goals,
      exclusions: row.exclusions,
      trainings_attended: row.trainings_attended,
      trainings_total: row.trainings_total,
      mvp_count: row.mvp_count,
    };
  });

  return {
    legends: computeLegends([...historicalPlayers, ...currentPlayers], metric),
    archivedSeasons: new Set(historicalPlayers.map((row) => row.season_id)).size,
    currentSeasonLabel: currentSeason.label,
  };
}

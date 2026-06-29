import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  goalsConsecEvents,
  exclConsecEvents,
  trainConsecEvents,
  mvpConsecEvents,
  applyStreak,
  emptyStreak,
} from "../lib/domain/streaks.ts";

config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const RUBEN_ID = "b998a15b-aa0b-4d37-af7d-bc32aef751a3";
const SEASON_ID = "9e8945bd-fe73-40d8-8ac5-59e39f359843";

const nowIso = new Date().toISOString();

const { data: matchStats } = await admin
  .from("match_stats")
  .select("match_id, player_id, goals, exclusions, mvp")
  .eq("player_id", RUBEN_ID);

const matchIds = (matchStats ?? []).map((s) => s.match_id).filter(Boolean);
const { data: matches } = matchIds.length
  ? await admin
      .from("matches")
      .select("id, season_id, status, scheduled_at, team_id, mvp_player_id")
      .in("id", matchIds)
      .eq("season_id", SEASON_ID)
      .eq("status", "played")
      .order("scheduled_at")
  : { data: [] };
const matchesById = new Map((matches ?? []).map((m) => [m.id, m]));

const { data: att } = await admin
  .from("training_attendance")
  .select("present, session_id")
  .eq("player_id", RUBEN_ID);
const sessionIds = (att ?? []).map((a) => a.session_id).filter(Boolean);
const { data: sessions } = sessionIds.length
  ? await admin
      .from("training_sessions")
      .select("id, scheduled_at, cancelled, team_id")
      .in("id", sessionIds)
      .order("scheduled_at")
  : { data: [] };
const sessionsById = new Map((sessions ?? []).map((s) => [s.id, s]));

async function upsertStreak(type, events) {
  const prev = await admin
    .from("streaks")
    .select("current_value, best_value, best_at, last_event_at")
    .eq("season_id", SEASON_ID)
    .eq("subject_type", "player")
    .eq("subject_id", RUBEN_ID)
    .eq("streak_type", type)
    .maybeSingle();
  const prevRecord = prev.data
    ? {
        current_value: Number(prev.data.current_value ?? 0),
        best_value: Number(prev.data.best_value ?? 0),
        best_at: prev.data.best_at,
        last_event_at: prev.data.last_event_at,
      }
    : emptyStreak();
  const next = applyStreak(prevRecord, events, nowIso);
  const { error } = await admin.from("streaks").upsert(
    {
      season_id: SEASON_ID,
      subject_type: "player",
      subject_id: RUBEN_ID,
      streak_type: type,
      current_value: next.current_value,
      best_value: next.best_value,
      best_at: next.best_at,
      last_event_at: next.last_event_at,
      updated_at: nowIso,
    },
    { onConflict: "season_id,subject_type,subject_id,streak_type" },
  );
  if (error) console.log("  upsert err", type, error.message);
  else console.log("  ", type, ": current=" + next.current_value, "best=" + next.best_value);
}

const statsForPlayer = (matchStats ?? [])
  .filter((s) => matchesById.has(s.match_id))
  .map((s) => {
    const m = matchesById.get(s.match_id);
    return { match_id: s.match_id, scheduled_at: m.scheduled_at, goals: s.goals, exclusions: s.exclusions };
  });

const matchesForPlayer = (matches ?? []).map((m) => ({ id: m.id, scheduled_at: m.scheduled_at, mvp_player_id: m.mvp_player_id }));

const sessionsForPlayer = (att ?? [])
  .map((a) => {
    const s = sessionsById.get(a.session_id);
    return { scheduled_at: s?.scheduled_at, cancelled: s?.cancelled, present: a.present };
  })
  .filter((x) => x.scheduled_at);

await upsertStreak("goals_consec", goalsConsecEvents(statsForPlayer));
await upsertStreak("excl_consec", exclConsecEvents(statsForPlayer));
await upsertStreak("train_consec", trainConsecEvents(sessionsForPlayer, att ?? []));
await upsertStreak("mvp_consec", mvpConsecEvents(matchesForPlayer, RUBEN_ID));

console.log("=== DONE ===");
process.exit(0);

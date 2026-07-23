export type StreakType =
  "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec" | "wins_consec";

export type StreakSubjectType = "player" | "team";

export interface StreakKey {
  subject_type: StreakSubjectType;
  subject_id: string;
  streak_type: StreakType;
}

export interface StreakEvent {
  occurred_at: string;
  pass: boolean;
}

export interface StreakResult {
  current_value: number;
  best_value: number;
  best_at: string | null;
  last_event_at: string | null;
}

export interface StreakRecord {
  current_value: number;
  best_value: number;
  best_at: string | null;
  last_event_at: string | null;
}

const STREAK_LABELS: Record<StreakType, string> = {
  goals_consec: "Partidos seguidos marcando gol",
  excl_consec: "Partidos seguidos con al menos 1 expulsión",
  train_consec: "Días seguidos yendo a entrenar",
  mvp_consec: "Partidos seguidos siendo MVP",
  wins_consec: "Partidos ganados seguidos",
};

const STREAK_PICTOGRAM_HINT: Record<
  StreakType,
  "balon" | "exclusion" | "silbato" | "porteria" | "trofeo"
> = {
  goals_consec: "balon",
  excl_consec: "exclusion",
  train_consec: "silbato",
  mvp_consec: "porteria",
  wins_consec: "trofeo",
};

export function streakLabel(t: StreakType): string {
  return STREAK_LABELS[t];
}

export function streakPictogramHint(
  t: StreakType,
): "balon" | "exclusion" | "silbato" | "porteria" | "trofeo" {
  return STREAK_PICTOGRAM_HINT[t];
}

export function emptyStreak(): StreakRecord {
  return { current_value: 0, best_value: 0, best_at: null, last_event_at: null };
}

function dayDiff(later: string, earlier: string): number {
  const a = new Date(later);
  const b = new Date(earlier);
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aUTC - bUTC) / 86400000);
}

export function applyStreak(
  prev: StreakRecord,
  events: StreakEvent[],
  _nowIso: string,
): StreakRecord {
  const sorted = events.slice().sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  let current = 0;
  let best = prev.best_value;
  let bestAt = prev.best_at;
  let lastEventAt: string | null = prev.last_event_at;
  for (const ev of sorted) {
    if (ev.pass) {
      current += 1;
      lastEventAt = ev.occurred_at;
      if (current > best) {
        best = current;
        bestAt = ev.occurred_at;
      }
    } else {
      current = 0;
      lastEventAt = ev.occurred_at;
    }
  }
  if (current === 0 && !sorted.some((e) => e.pass)) {
    best = prev.best_value;
    bestAt = prev.best_at;
  }
  return {
    current_value: current,
    best_value: best,
    best_at: bestAt,
    last_event_at: lastEventAt,
  };
}

export function goalsConsecEvents(
  matchStats: Array<{ match_id: string; scheduled_at: string; goals: number }>,
): StreakEvent[] {
  return matchStats
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((m) => ({ occurred_at: m.scheduled_at, pass: m.goals >= 1 }));
}

export function exclConsecEvents(
  matchStats: Array<{ match_id: string; scheduled_at: string; exclusions: number }>,
): StreakEvent[] {
  return matchStats
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((m) => ({ occurred_at: m.scheduled_at, pass: m.exclusions >= 1 }));
}

export function trainConsecEvents(
  sessions: Array<{ id: string; scheduled_at: string; cancelled: boolean }>,
  attendance: Array<{ session_id: string; present: boolean }>,
  throughIso?: string,
): StreakEvent[] {
  const map = new Map<string, boolean>();
  for (const a of attendance) map.set(a.session_id, a.present);
  return sessions
    .filter((session) => !session.cancelled && (!throughIso || session.scheduled_at <= throughIso))
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((s) => ({ occurred_at: s.scheduled_at, pass: map.get(s.id) === true }));
}

export function mvpConsecEvents(
  matches: Array<{ id: string; scheduled_at: string; mvp_player_id: string | null }>,
  playerId: string,
): StreakEvent[] {
  return matches
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((m) => ({ occurred_at: m.scheduled_at, pass: m.mvp_player_id === playerId }));
}

export function winsConsecEvents(
  matches: Array<{
    id: string;
    scheduled_at: string;
    status: string;
    final_score_us: number | null;
    final_score_them: number | null;
  }>,
): StreakEvent[] {
  return matches
    .filter((m) => m.status === "played" && m.final_score_us != null && m.final_score_them != null)
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((m) => ({
      occurred_at: m.scheduled_at,
      pass: (m.final_score_us ?? 0) > (m.final_score_them ?? 0),
    }));
}

export function isStreakStillActive(
  lastEventAt: string | null,
  currentValue: number,
  nowIso: string,
  type: StreakType,
): boolean {
  if (currentValue === 0) return false;
  if (!lastEventAt) return true;
  const diff = dayDiff(nowIso, lastEventAt);
  if (type === "train_consec") return diff <= 2;
  return diff <= 14;
}

export function streakSummary(
  type: StreakType,
  value: number,
  _subjectType: StreakSubjectType,
): string {
  if (value === 0) return "Sin racha activa";
  const unit = type === "train_consec" ? "días" : "partidos";
  return `${value} ${unit} seguidos`;
}

export function isStreakVisible(subjectType: StreakSubjectType, currentValue: number): boolean {
  return currentValue > 0;
}

export function allStreakTypes(): StreakType[] {
  return ["goals_consec", "excl_consec", "train_consec", "mvp_consec", "wins_consec"];
}

export function allStreakTypesFor(subjectType: StreakSubjectType): StreakType[] {
  if (subjectType === "team") return ["wins_consec"];
  return ["goals_consec", "excl_consec", "train_consec", "mvp_consec"];
}

import { type CategoryCode } from "./categories";

export type RankingMetric = "goals" | "exclusions" | "mvp" | "attendance" | "streak";

export interface PlayerStatsInput {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  category_code: CategoryCode;
  team_id: string | null;
  team_label: string | null;
  team_color: string | null;
  matches_played: number;
  goals: number;
  exclusions: number;
  mvp_count: number;
  trainings_attended: number;
  trainings_total: number;
  attendance_pct: number;
  attendance_streak: number;
}

export interface RankingPlayer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  category_code: CategoryCode;
  team_id: string | null;
  team_label: string | null;
  team_color: string | null;
  primary_value: number;
  full_name_locale: string;
  matches_played: number;
  goals: number;
  exclusions: number;
  mvp_count: number;
  trainings_attended: number;
  trainings_total: number;
  attendance_pct: number;
}

export interface RankingRow extends RankingPlayer {
  position: number;
  medal: "gold" | "silver" | "bronze" | null;
}

export type RankingScope =
  | { kind: "all" }
  | { kind: "category"; category_code: CategoryCode }
  | { kind: "team"; team_id: string };

export interface ComputeRankingOptions {
  metric: RankingMetric;
  scope: RankingScope;
  min_trainings_total?: number;
  top_n?: number;
}

const RANKING_LOCALE = "es";

function primaryValueOf(player: PlayerStatsInput, metric: RankingMetric): number {
  switch (metric) {
    case "goals":
      return player.goals;
    case "exclusions":
      return player.exclusions;
    case "mvp":
      return player.mvp_count;
    case "attendance":
      return player.attendance_pct;
    case "streak":
      return player.attendance_streak;
  }
}

function isInScope(player: PlayerStatsInput, scope: RankingScope): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "category") {
    return player.category_code === scope.category_code;
  }
  return player.team_id === scope.team_id;
}

function metricIsAscending(_metric: RankingMetric): boolean {
  return false;
}

function toRankingPlayer(player: PlayerStatsInput, primary: number): RankingPlayer {
  return {
    player_id: player.player_id,
    full_name: player.full_name,
    photo_url: player.photo_url,
    cap_number: player.cap_number,
    category_code: player.category_code,
    team_id: player.team_id,
    team_label: player.team_label,
    team_color: player.team_color,
    primary_value: primary,
    full_name_locale: player.full_name,
    matches_played: player.matches_played,
    goals: player.goals,
    exclusions: player.exclusions,
    mvp_count: player.mvp_count,
    trainings_attended: player.trainings_attended,
    trainings_total: player.trainings_total,
    attendance_pct: player.attendance_pct,
  };
}

function medalFor(position: number): "gold" | "silver" | "bronze" | null {
  if (position === 1) return "gold";
  if (position === 2) return "silver";
  if (position === 3) return "bronze";
  return null;
}

export function computeRanking(
  players: PlayerStatsInput[],
  options: ComputeRankingOptions,
): RankingRow[] {
  const { metric, scope, min_trainings_total = 0, top_n } = options;
  const ascending = metricIsAscending(metric);

  const eligible = players
    .filter((p) => isInScope(p, scope))
    .filter((p) => p.trainings_total >= min_trainings_total);

  const ranked = eligible.map((p) => toRankingPlayer(p, primaryValueOf(p, metric)));

  ranked.sort((a, b) => {
    if (a.primary_value !== b.primary_value) {
      return ascending ? a.primary_value - b.primary_value : b.primary_value - a.primary_value;
    }
    const aCap = a.cap_number ?? 100;
    const bCap = b.cap_number ?? 100;
    if (aCap !== bCap) return aCap - bCap;
    return a.full_name_locale.localeCompare(b.full_name_locale, RANKING_LOCALE);
  });

  const sliced = top_n != null ? ranked.slice(0, top_n) : ranked;

  const rows: RankingRow[] = [];
  for (let i = 0; i < sliced.length; i++) {
    const entry = sliced[i]!;
    const position = i + 1;
    rows.push({
      ...entry,
      position,
      medal: medalFor(position),
    });
  }
  return rows;
}

export interface MyPositionInfo {
  row: RankingRow;
  delta_to_next: number | null;
  delta_to_prev: number | null;
}

export function findMyPosition(ranking: RankingRow[], playerId: string): MyPositionInfo | null {
  const idx = ranking.findIndex((r) => r.player_id === playerId);
  if (idx === -1) return null;
  const row = ranking[idx]!;
  const above = ranking[idx - 1] ?? null;
  const below = ranking[idx + 1] ?? null;
  const delta_to_next = above ? above.primary_value - row.primary_value : null;
  const delta_to_prev = below ? row.primary_value - below.primary_value : null;
  return { row, delta_to_next, delta_to_prev };
}

export const RANKINGS_PAGE_SIZE = 10;

export interface PagedRanking {
  page: number;
  page_size: number;
  total_players: number;
  total_pages: number;
  rows: RankingRow[];
}

export interface PaginateRankingOptions {
  ranking: RankingRow[];
  page: number;
  page_size?: number;
}

export interface RankingPageWithPodium extends PagedRanking {
  podium_rows: RankingRow[];
  list_rows: RankingRow[];
}

export function paginateRanking({
  ranking,
  page,
  page_size = RANKINGS_PAGE_SIZE,
}: PaginateRankingOptions): PagedRanking {
  const total = ranking.length;
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / page_size));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * page_size;
  const rows = ranking.slice(start, start + page_size);
  return { page: safePage, page_size, total_players: total, total_pages: totalPages, rows };
}

export function paginateRankingWithPodium(options: PaginateRankingOptions): RankingPageWithPodium {
  const paged = paginateRanking(options);
  const podiumRows = paged.page === 1 ? paged.rows.slice(0, 3) : [];
  const listRows = paged.page === 1 ? paged.rows.slice(3) : paged.rows;
  return { ...paged, podium_rows: podiumRows, list_rows: listRows };
}

export function isMyPositionOutsideTopN(
  ranking: RankingRow[],
  playerId: string | null,
  topN: number,
): boolean {
  if (!playerId) return false;
  const idx = ranking.findIndex((r) => r.player_id === playerId);
  if (idx === -1) return false;
  return idx >= topN;
}

export interface SessionLite {
  id: string;
  scheduled_at: string;
  cancelled: boolean;
}

export interface AttendanceLite {
  session_id: string;
  present: boolean;
}

export function computeAttendanceStreak(
  sessions: SessionLite[],
  attendance: AttendanceLite[],
): number {
  const attendanceBySession = new Map<string, boolean>();
  for (const row of attendance) {
    attendanceBySession.set(row.session_id, row.present);
  }
  const sorted = sessions
    .filter((s) => !s.cancelled)
    .slice()
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  let streak = 0;
  for (const s of sorted) {
    if (attendanceBySession.get(s.id) === true) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

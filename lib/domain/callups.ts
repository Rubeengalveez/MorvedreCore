import { type CategoryCode } from "./categories";

export type CallupStatus = "called" | "confirmed" | "declined" | "withdrawn" | "no_show";

export interface CallupSuggestion {
  player_id: string;
  full_name: string;
  cap_number: number | null;
  category_code: CategoryCode;
  source_team_id: string | null;
  is_ascending: boolean;
  has_conflict: boolean;
  is_substitute: boolean;
  reason: string | null;
}

export interface TeamForCallup {
  id: string;
  category_code: CategoryCode;
  label: string;
}

export interface PlayerForCallup {
  id: string;
  full_name: string;
  category_code: CategoryCode;
  cap_number: number | null;
  current_team_id: string | null;
  birth_year?: number | null;
  was_previous_callup?: boolean;
  goals?: number;
  attendance_pct?: number;
  exclusions?: number;
}

export interface AvailabilityRow {
  player_id: string;
  date: string;
  available: boolean;
  reason: string | null;
}

const CATEGORY_ORDER: readonly CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
];

function categoryIndex(category: CategoryCode): number {
  if (category === "escuela") return -1;
  return CATEGORY_ORDER.indexOf(category);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function canCallUpTo(
  playerCategory: CategoryCode,
  teamCategory: CategoryCode,
  _referenceYear?: number,
): boolean {
  void _referenceYear;
  if (teamCategory === "escuela" || playerCategory === "escuela") return true;
  const playerIdx = categoryIndex(playerCategory);
  const teamIdx = categoryIndex(teamCategory);
  return teamIdx - playerIdx <= 1;
}

export interface BRuleTeams {
  teamA: TeamForCallup | null;
  teamB: TeamForCallup | null;
}

function labelMatchesA(label: string): boolean {
  return /(^|\s)A(\s|$)/i.test(label) || /A$/i.test(label);
}

function labelMatchesB(label: string): boolean {
  return /(^|\s)B(\s|$)/i.test(label) || /B$/i.test(label);
}

export function getBRuleTeamsForCategory(
  teams: TeamForCallup[],
  category: CategoryCode,
): BRuleTeams {
  const sameCat = teams.filter((t) => t.category_code === category);
  if (sameCat.length < 2) return { teamA: null, teamB: null };

  const labelledA = sameCat.find((t) => labelMatchesA(t.label));
  const labelledB = sameCat.find((t) => labelMatchesB(t.label));
  if (labelledA && labelledB && labelledA.id !== labelledB.id) {
    return { teamA: labelledA, teamB: labelledB };
  }
  return { teamA: null, teamB: null };
}

export function isPlayerBRuleBlocked(
  _playerId: string,
  playerTeamId: string,
  targetTeamId: string,
  allTeams: TeamForCallup[],
): boolean {
  const target = allTeams.find((t) => t.id === targetTeamId);
  if (!target) return false;
  const playerTeam = allTeams.find((t) => t.id === playerTeamId);
  if (!playerTeam) return false;
  if (playerTeam.category_code !== target.category_code) return false;

  const { teamA, teamB } = getBRuleTeamsForCategory(allTeams, target.category_code);
  if (!teamA || !teamB) return false;

  return (
    (playerTeamId === teamA.id && targetTeamId === teamB.id) ||
    (playerTeamId === teamB.id && targetTeamId === teamA.id)
  );
}

export function findConflicts(
  playerId: string,
  scheduledAt: Date | string,
  availability: AvailabilityRow[],
): boolean {
  const date =
    typeof scheduledAt === "string" ? scheduledAt.slice(0, 10) : formatLocalDate(scheduledAt);
  return availability.some(
    (a) => a.player_id === playerId && a.date === date && a.available === false,
  );
}

export interface SuggestCallupArgs {
  targetTeam: TeamForCallup;
  scheduledAt: Date | string;
  allTeams: TeamForCallup[];
  allPlayers: PlayerForCallup[];
  allAvailability: AvailabilityRow[];
  max?: number;
}

export function suggestCallup(args: SuggestCallupArgs): CallupSuggestion[] {
  const { targetTeam, scheduledAt, allTeams, allPlayers, allAvailability, max = 13 } = args;
  const scheduledDate =
    typeof scheduledAt === "string" ? scheduledAt.slice(0, 10) : formatLocalDate(scheduledAt);
  const targetIdx = categoryIndex(targetTeam.category_code);

  type Scored = {
    player: PlayerForCallup;
    eligibilityTier: number;
    isAscending: boolean;
  };

  const scored: Scored[] = [];

  for (const player of allPlayers) {
    const playerTeam = player.current_team_id
      ? allTeams.find((t) => t.id === player.current_team_id)
      : null;

    if (playerTeam && playerTeam.id === targetTeam.id) {
      scored.push({
        player,
        eligibilityTier: 0,
        isAscending: false,
      });
      continue;
    }

    if (player.category_code === targetTeam.category_code) {
      if (playerTeam && isPlayerBRuleBlocked(player.id, playerTeam.id, targetTeam.id, allTeams)) {
        continue;
      }
      scored.push({
        player,
        eligibilityTier: 1,
        isAscending: false,
      });
      continue;
    }

    if (!canCallUpTo(player.category_code, targetTeam.category_code)) {
      continue;
    }

    const dist = targetIdx - categoryIndex(player.category_code);
    scored.push({
      player,
      eligibilityTier: 10 + Math.abs(dist),
      isAscending: dist > 0,
    });
  }

  scored.sort((a, b) => {
    if (a.eligibilityTier !== b.eligibilityTier) return a.eligibilityTier - b.eligibilityTier;
    const priority = compareCallupPriority(a.player, b.player, scheduledAt);
    if (priority !== 0) return priority;
    const capA = a.player.cap_number ?? 100;
    const capB = b.player.cap_number ?? 100;
    if (capA !== capB) return capA - capB;
    return a.player.full_name.localeCompare(b.player.full_name);
  });

  return scored.map((s, idx): CallupSuggestion => {
    const isFromOtherTeam =
      s.player.current_team_id !== null && s.player.current_team_id !== targetTeam.id;
    return {
      player_id: s.player.id,
      full_name: s.player.full_name,
      cap_number: s.player.cap_number,
      category_code: s.player.category_code,
      source_team_id: isFromOtherTeam ? s.player.current_team_id : null,
      is_ascending: s.isAscending,
      has_conflict: findConflicts(s.player.id, scheduledDate, allAvailability),
      is_substitute: idx >= max,
      reason: suggestionReason(s.player),
    };
  });
}

function callupPriority(player: PlayerForCallup, scheduledAt: Date | string): number[] {
  const matchYear = new Date(scheduledAt).getFullYear();
  const age = player.birth_year ? Math.max(0, matchYear - player.birth_year) : 0;
  return [
    player.was_previous_callup ? 1 : 0,
    Math.max(0, player.goals ?? 0),
    age,
    Math.max(0, Math.min(100, player.attendance_pct ?? 0)),
    -Math.max(0, player.exclusions ?? 0),
  ];
}

function compareCallupPriority(
  first: PlayerForCallup,
  second: PlayerForCallup,
  scheduledAt: Date | string,
): number {
  const firstPriority = callupPriority(first, scheduledAt);
  const secondPriority = callupPriority(second, scheduledAt);
  for (let index = 0; index < firstPriority.length; index += 1) {
    const difference = (secondPriority[index] ?? 0) - (firstPriority[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function suggestionReason(player: PlayerForCallup): string {
  const parts: string[] = [];
  if (player.was_previous_callup) parts.push("Estuvo en la convocatoria anterior");
  if ((player.goals ?? 0) > 0) parts.push(`${player.goals} goles`);
  if ((player.attendance_pct ?? 0) > 0) {
    parts.push(`${Math.round(player.attendance_pct ?? 0)}% de asistencia`);
  }
  if ((player.exclusions ?? 0) === 0) parts.push("Sin expulsiones");
  return parts.length > 0 ? parts.join(" · ") : "Plantilla y categoría compatibles";
}

export function defaultCapForPlayer(
  _playerId: string,
  playerProfile: { cap_number: number | null },
  _targetTeamId: string,
  existingCallupsInMatch: { player_id: string; cap_number: number }[],
): number | null {
  const startCap = playerProfile.cap_number;
  if (startCap == null) return null;

  const taken = new Set(existingCallupsInMatch.map((c) => c.cap_number));
  if (!taken.has(startCap)) return startCap;

  for (let i = 1; i <= 99; i++) {
    const candidate = ((startCap - 1 + i) % 99) + 1;
    if (!taken.has(candidate)) return candidate;
  }
  return null;
}

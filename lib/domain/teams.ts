import {
  CATEGORY_COLORS,
  CATEGORY_DEFAULT_GENDER,
  inferCategory,
  type CategoryCode,
  type TeamGender,
} from "./categories";

const CATEGORY_ORDER: readonly CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
];

function categoryIndex(category: CategoryCode): number {
  return CATEGORY_ORDER.indexOf(category);
}

export function canRosterPlayer(
  playerBirthYear: number,
  teamCategory: CategoryCode,
  currentYear: number,
): boolean {
  if (teamCategory === "escuela") return true;
  const playerCategory = inferCategory(playerBirthYear, currentYear);
  const playerIdx = categoryIndex(playerCategory);
  const teamIdx = categoryIndex(teamCategory);
  return teamIdx >= playerIdx && teamIdx - playerIdx <= 1;
}

export function defaultTeamColor(category: CategoryCode): string {
  return CATEGORY_COLORS[category];
}

export function defaultTeamGender(category: CategoryCode): TeamGender {
  return CATEGORY_DEFAULT_GENDER[category];
}

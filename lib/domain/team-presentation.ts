import { CATEGORY_LABELS, safeInferCategory, type CategoryCode } from "./categories";

export const TEAM_CATEGORY_ORDER: CategoryCode[] = [
  "escuela",
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
];
export const TEAM_GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};
export const TEAM_STAFF_LABELS: Record<string, string> = {
  head_coach: "Entrenador",
  assistant_coach: "Entrenador asistente",
  delegate: "Delegado",
  physical_trainer: "Preparador físico",
};

export function matchesTeamSearch(text: string, query: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const target = normalize(text);
  return normalize(query)
    .split(/\s+/)
    .every((word) => target.includes(word));
}

export function compareTeams(
  a: { category_code: string; label: string },
  b: { category_code: string; label: string },
) {
  return (
    TEAM_CATEGORY_ORDER.indexOf(a.category_code as CategoryCode) -
      TEAM_CATEGORY_ORDER.indexOf(b.category_code as CategoryCode) ||
    a.label.localeCompare(b.label, "es", { numeric: true })
  );
}

export function teamCategoryLabel(code: string) {
  return CATEGORY_LABELS[code as CategoryCode] ?? code;
}

export function teamSeasonYear(startDate: string) {
  return Number(startDate.slice(0, 4));
}

export function splitTeamRoster<T extends { birth_year: number | null }>(
  players: T[],
  category: CategoryCode,
  year: number,
) {
  const lower = TEAM_CATEGORY_ORDER[TEAM_CATEGORY_ORDER.indexOf(category) - 1];
  const isReinforcement = (player: T) =>
    category !== "escuela" &&
    lower !== "escuela" &&
    player.birth_year != null &&
    safeInferCategory(player.birth_year, year) === lower;
  return {
    own: players.filter((player) => !isReinforcement(player)),
    reinforcements: players.filter(isReinforcement),
  };
}

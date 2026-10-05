import { CATEGORY_LABELS, safeInferCategory, type CategoryCode } from "./categories";

export type PlayerFilters = {
  page: number;
  query: string;
  status: "active" | "inactive" | "all";
  teamId: string;
  category: string;
};

export function normalizePlayerSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

export function playerCategory(
  birthYear: number | null,
  seasonYear: number,
  school: boolean,
): CategoryCode | null {
  return school ? "escuela" : birthYear == null ? null : safeInferCategory(birthYear, seasonYear);
}

export function matchesPlayerSearch(query: string, values: Array<string | number | null>): boolean {
  const haystack = normalizePlayerSearch(values.filter((value) => value != null).join(" "));
  return normalizePlayerSearch(query)
    .split(" ")
    .every((word) => haystack.includes(word));
}

export function categorySearchLabel(category: CategoryCode | null): string {
  return category ? CATEGORY_LABELS[category] : "Sin año de nacimiento";
}

export function playerListHref(filters: PlayerFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.status !== "active") params.set("status", filters.status);
  if (filters.teamId) params.set("team", filters.teamId);
  if (filters.category) params.set("category", filters.category);
  if (page > 1) params.set("page", String(page));
  return `/admin/players${params.size ? `?${params}` : ""}`;
}

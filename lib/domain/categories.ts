export type CategoryCode =
  "benjamin" | "alevin" | "infantil" | "cadete" | "juvenil" | "absoluto" | "escuela";

export type TeamGender = "male" | "female" | "mixed";

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  benjamin: "Benjamín",
  alevin: "Alevín",
  infantil: "Infantil",
  cadete: "Cadete",
  juvenil: "Juvenil",
  absoluto: "Absoluto",
  escuela: "Escuela",
};

export const CATEGORY_COLORS: Record<CategoryCode, string> = {
  benjamin: "#10B981",
  alevin: "#F4C430",
  infantil: "#FF6B35",
  cadete: "#1E5AA8",
  juvenil: "#DC2626",
  absoluto: "#0F172A",
  escuela: "#16A34A",
};

export const CATEGORY_SURFACE_COLORS: Record<CategoryCode, string> = {
  benjamin: "#D8F5EA",
  alevin: "#FFF0B8",
  infantil: "#FFD09A",
  cadete: "#ADD4FF",
  juvenil: "#F6B4BC",
  absoluto: "#BFC0C4",
  escuela: "#D9F2DF",
};

export const CATEGORY_DEFAULT_GENDER: Record<CategoryCode, TeamGender> = {
  benjamin: "mixed",
  alevin: "mixed",
  infantil: "mixed",
  cadete: "male",
  juvenil: "male",
  absoluto: "male",
  escuela: "mixed",
};

export function ageIndex(birthYear: number, currentYear: number): number {
  return currentYear - birthYear;
}

export function calendarSeasonStartYear(date = new Date()): number {
  return date.getFullYear() - (date.getMonth() < 8 ? 1 : 0);
}

export function inferCategory(birthYear: number, seasonStartYear: number): CategoryCode {
  if (birthYear > seasonStartYear) {
    throw new Error(
      `birthYear (${birthYear}) cannot be in the future (seasonStartYear: ${seasonStartYear})`,
    );
  }
  const age = ageIndex(birthYear, seasonStartYear);
  if (age <= 9) return "benjamin";
  if (age <= 11) return "alevin";
  if (age <= 13) return "infantil";
  if (age <= 15) return "cadete";
  if (age <= 17) return "juvenil";
  return "absoluto";
}

export function safeInferCategory(birthYear: number, seasonStartYear: number): CategoryCode | null {
  const age = ageIndex(birthYear, seasonStartYear);
  if (age < 0) return null;
  return inferCategory(birthYear, seasonStartYear);
}

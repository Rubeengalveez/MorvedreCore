export const CATEGORY_LABELS = {
  benjamin: "Benjamín",
  alevin: "Alevín",
  infantil: "Infantil",
  cadete: "Cadete",
  juvenil: "Juvenil",
  absoluto: "Absoluto",
  escuela: "Escuela",
};

export const CATEGORY_COLORS = {
  benjamin: "#10B981",
  alevin: "#F4C430",
  infantil: "#FF6B35",
  cadete: "#1E5AA8",
  juvenil: "#DC2626",
  absoluto: "#0F172A",
  escuela: "#FFFFFF",
};

export const CATEGORY_SURFACE_COLORS = {
  benjamin: "#D8F5EA",
  alevin: "#FFF0B8",
  infantil: "#FFD09A",
  cadete: "#ADD4FF",
  juvenil: "#F6B4BC",
  absoluto: "#BFC0C4",
  escuela: "#D9F2DF",
};

export const CATEGORY_DEFAULT_GENDER = {
  benjamin: "mixed",
  alevin: "mixed",
  infantil: "mixed",
  cadete: "male",
  juvenil: "male",
  absoluto: "male",
  escuela: "mixed",
};

export function ageIndex(birthYear, currentYear) {
  return currentYear - birthYear;
}

export function calendarSeasonStartYear(date = new Date()) {
  return date.getFullYear() - (date.getMonth() < 8 ? 1 : 0);
}

export function inferCategory(birthYear, seasonStartYear) {
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

export function safeInferCategory(birthYear, seasonStartYear) {
  const age = ageIndex(birthYear, seasonStartYear);
  if (age < 0) return null;
  return inferCategory(birthYear, seasonStartYear);
}

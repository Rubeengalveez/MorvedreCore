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

export const CATEGORY_DEFAULT_GENDER = {
  benjamin: "mixed",
  alevin: "mixed",
  infantil: "mixed",
  cadete: "male",
  juvenil: "male",
  absoluto: "male",
  escuela: "mixed",
};

const MAX_AGE_THRESHOLD = 25;

export function ageIndex(birthYear, currentYear) {
  return currentYear - birthYear;
}

export function inferCategory(birthYear, currentYear) {
  if (birthYear > currentYear) {
    throw new Error(
      `birthYear (${birthYear}) cannot be in the future (currentYear: ${currentYear})`,
    );
  }
  if (birthYear < currentYear - MAX_AGE_THRESHOLD) {
    throw new Error(
      `birthYear (${birthYear}) is too old for the roster (currentYear: ${currentYear})`,
    );
  }
  const age = ageIndex(birthYear, currentYear);
  if (age <= 11) return "benjamin";
  if (age <= 13) return "alevin";
  if (age <= 15) return "infantil";
  if (age <= 17) return "cadete";
  if (age <= 19) return "juvenil";
  return "absoluto";
}

export function safeInferCategory(birthYear, currentYear) {
  const age = ageIndex(birthYear, currentYear);
  if (age < 0) return null;
  if (age > MAX_AGE_THRESHOLD) return null;
  return inferCategory(birthYear, currentYear);
}

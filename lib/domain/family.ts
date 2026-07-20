export const ADULT_AGE = 18;

export type FamilyRelation = "mother" | "father" | "legal_guardian" | "other";

export const FAMILY_RELATION_LABELS: Record<FamilyRelation, string> = {
  mother: "Madre",
  father: "Padre",
  legal_guardian: "Tutor legal",
  other: "Familiar responsable",
};

export function ageFromBirthYear(birthYear: number | null, onDate = new Date()): number | null {
  if (birthYear == null) return null;
  return onDate.getFullYear() - birthYear;
}

export function requiresGuardianApproval(birthYear: number | null, onDate = new Date()): boolean {
  const age = ageFromBirthYear(birthYear, onDate);
  return age == null || age < ADULT_AGE;
}

export function canViewPersonalFinances(birthYear: number | null, onDate = new Date()): boolean {
  const age = ageFromBirthYear(birthYear, onDate);
  return age != null && age >= ADULT_AGE;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function normalizeFullName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
}

export function findUniqueExactProfile<T extends { full_name: string }>(
  profiles: readonly T[], fullName: string,
): T | null {
  const target = normalizeFullName(fullName);
  const matches = profiles.filter((profile) => normalizeFullName(profile.full_name) === target);
  return matches.length === 1 ? matches[0] : null;
}

export function requiresTemporaryPassword(verifiedGoogleUserId: string | null): boolean {
  return verifiedGoogleUserId === null;
}

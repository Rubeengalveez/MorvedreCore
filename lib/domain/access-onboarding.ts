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

export function findUniqueFlexiblePlayer<T extends { full_name: string }>(
  profiles: readonly T[], fullName: string,
): T | null {
  const entered = normalizeFullName(fullName).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (entered.length < 2) return null;
  const matches = profiles.filter((profile) => {
    const registered = normalizeFullName(profile.full_name).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    if (registered[0] !== entered[0]) return false;
    let position = 1;
    for (const token of entered.slice(1)) {
      position = registered.indexOf(token, position);
      if (position < 0) return false;
      position += 1;
    }
    return true;
  });
  return matches.length === 1 ? matches[0] : null;
}

export function requiresTemporaryPassword(verifiedGoogleUserId: string | null): boolean {
  return verifiedGoogleUserId === null;
}

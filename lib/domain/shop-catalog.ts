export const SHOP_PRODUCT_TYPES = [
  "Camisetas",
  "Pantalones",
  "Sudaderas",
  "Bañadores",
  "Accesorios",
] as const;

export function shopProductType(value = ""): string {
  return (
    SHOP_PRODUCT_TYPES.find(
      (type) => type.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"),
    ) ?? "Accesorios"
  );
}

export function shopFamilyIds(
  profileId: string,
  links: Array<{ parent_profile_id: string; child_profile_id: string }>,
): string[] {
  const found = new Set([profileId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of links) {
      if (found.has(link.parent_profile_id) || found.has(link.child_profile_id)) {
        for (const id of [link.parent_profile_id, link.child_profile_id]) {
          if (!found.has(id)) {
            found.add(id);
            changed = true;
          }
        }
      }
    }
  }
  return [...found];
}

export function moveShopPhoto<T>(photos: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= photos.length || to >= photos.length)
    return photos;
  const next = [...photos];
  const [photo] = next.splice(from, 1);
  next.splice(to, 0, photo);
  return next;
}

import { describe, expect, it } from "vitest";
import {
  moveShopPhoto,
  shopFamilyIds,
  shopProductType,
  SHOP_PRODUCT_TYPES,
} from "@/lib/domain/shop-catalog";
import { matchesShopSearch, safeShopReturn, shopListHref } from "@/lib/domain/shop-management";

describe("Catálogo e historial de tienda", () => {
  it("reduce los tipos a cinco y normaliza los antiguos", () => {
    expect(SHOP_PRODUCT_TYPES).toHaveLength(5);
    expect(shopProductType("sudaderas")).toBe("Sudaderas");
    expect(shopProductType("Gorros")).toBe("Accesorios");
  });
  it("incluye ambos padres, hermanos y pedidos vinculados sin ciclos ni otras familias", () => {
    const links = [
      { parent_profile_id: "p1", child_profile_id: "c1" },
      { parent_profile_id: "p2", child_profile_id: "c1" },
      { parent_profile_id: "p1", child_profile_id: "c2" },
      { parent_profile_id: "other", child_profile_id: "other-child" },
    ];
    expect(new Set(shopFamilyIds("c1", links))).toEqual(new Set(["p1", "p2", "c1", "c2"]));
    expect(new Set(shopFamilyIds("p2", links))).toEqual(new Set(["p1", "p2", "c1", "c2"]));
    expect(shopFamilyIds("alone", links)).toEqual(["alone"]);
  });
  it("conserva fotos al mover la portada y protege posiciones inválidas", () => {
    const photos = ["old", "new1", "new2"];
    expect(moveShopPhoto(photos, 2, 0)).toEqual(["new2", "old", "new1"]);
    expect(photos).toEqual(["old", "new1", "new2"]);
    expect(moveShopPhoto(photos, -1, 0)).toBe(photos);
  });
  it("tolera tildes, separadores, orden de palabras y texto pegado", () => {
    expect(
      matchesShopSearch("Amaya López · Alevín · Bañador", "  BANADOR—alevin\u200B  lopez "),
    ).toBe(true);
    expect(matchesShopSearch("Amaya López", "   ")).toBe(true);
    expect(matchesShopSearch("Amaya López", "Amaya sudadera")).toBe(false);
  });
  it("mantiene filtros al volver y rechaza destinos ajenos", () => {
    const href = shopListHref({ view: "orders", q: "María", category: "Cadete", filters: "1" });
    expect(safeShopReturn(href)).toBe(href);
    for (const value of [
      "https://example.com",
      "//example.com",
      "javascript:evil()",
      "http://[",
      "/admin/people",
    ])
      expect(safeShopReturn(value)).toBe("/admin/shop?view=orders");
  });
});

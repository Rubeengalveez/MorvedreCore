import { describe, expect, it } from "vitest";
import {
  formatCents,
  isValidShopOrderStatus,
  parseCartItem,
  parseProduct,
  SHOP_LIMITS,
  summarizeCart,
} from "@/lib/domain/shop";

describe("parseProduct", () => {
  it("acepta un producto valido", () => {
    const r = parseProduct({
      title: "Bañador Morvedre",
      description: "Bañador oficial del club",
      category: "Equipación",
      price_eur: 25.5,
      image_url: null,
      sizes: ["S", "M", "L"],
      available: true,
      stock: 10,
      max_per_order: 5,
      currency: "EUR",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value?.price_cents).toBe(2550);
      expect(r.value?.sizes).toEqual(["S", "M", "L"]);
    }
  });

  it("rechaza titulo vacio", () => {
    expect(parseProduct({ title: "   ", description: "x", category: "x", price_eur: 10 }).ok).toBe(false);
  });

  it("rechaza titulo demasiado largo", () => {
    expect(parseProduct({ title: "a".repeat(SHOP_LIMITS.MAX_TITLE + 1), description: "x", category: "x", price_eur: 10 }).ok).toBe(false);
  });

  it("rechaza precio <= 0", () => {
    expect(parseProduct({ title: "Bañador", description: "x", category: "x", price_eur: 0 }).ok).toBe(false);
  });

  it("rechaza precio demasiado alto", () => {
    expect(parseProduct({ title: "Bañador", description: "x", category: "x", price_eur: 9999 }).ok).toBe(false);
  });

  it("rechaza max_per_order fuera de rango", () => {
    expect(parseProduct({ title: "x", description: "x", category: "x", price_eur: 10, max_per_order: 0 }).ok).toBe(false);
    expect(parseProduct({ title: "x", description: "x", category: "x", price_eur: 10, max_per_order: 99 }).ok).toBe(false);
  });

  it("convierte precio a centavos", () => {
    const r = parseProduct({ title: "x", description: "x", category: "x", price_eur: 12.99 });
    if (r.ok) expect(r.value?.price_cents).toBe(1299);
  });
});

describe("parseCartItem", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  it("acepta item valido con size", () => {
    const r = parseCartItem({ product_id: validId, size: "M", quantity: 2 });
    expect(r.ok).toBe(true);
  });
  it("acepta item sin size", () => {
    const r = parseCartItem({ product_id: validId, size: "", quantity: 1 });
    expect(r.ok).toBe(true);
  });
  it("rechaza product_id invalido", () => {
    expect(parseCartItem({ product_id: "no-uuid", quantity: 1 }).ok).toBe(false);
  });
  it("rechaza quantity fuera de rango", () => {
    expect(parseCartItem({ product_id: validId, quantity: 0 }).ok).toBe(false);
    expect(parseCartItem({ product_id: validId, quantity: 99 }).ok).toBe(false);
  });
});

describe("summarizeCart", () => {
  const products = [
    { id: "a", price_cents: 1000, available: true, max_per_order: 10 },
    { id: "b", price_cents: 2000, available: true, max_per_order: 10 },
  ];
  it("rechaza carrito vacio", () => {
    expect(summarizeCart([], products).ok).toBe(false);
  });
  it("calcula total con 2 items", () => {
    const r = summarizeCart(
      [
        { product_id: "a", size: null, quantity: 3 },
        { product_id: "b", size: "L", quantity: 1 },
      ],
      products,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_cents).toBe(5000);
      expect(r.item_count).toBe(4);
    }
  });
  it("rechaza producto no disponible", () => {
    const r = summarizeCart([{ product_id: "c", size: null, quantity: 1 }], products);
    expect(r.ok).toBe(false);
  });
  it("rechaza si excede max_per_order", () => {
    const r = summarizeCart([{ product_id: "a", size: null, quantity: 11 }], products);
    expect(r.ok).toBe(false);
  });
});

describe("formatCents", () => {
  it("formatea correctamente", () => {
    expect(formatCents(2599)).toBe("25.99 EUR");
  });
  it("acepta otra moneda", () => {
    expect(formatCents(1000, "USD")).toBe("10.00 USD");
  });
});

describe("isValidShopOrderStatus", () => {
  it("acepta los 7 estados", () => {
    for (const s of ["pending_parent", "pending_admin", "rejected", "ordered", "received", "delivered", "cancelled"]) {
      expect(isValidShopOrderStatus(s)).toBe(true);
    }
  });
  it("rechaza otros valores", () => {
    expect(isValidShopOrderStatus("foo")).toBe(false);
    expect(isValidShopOrderStatus(null)).toBe(false);
  });
});

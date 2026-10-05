import { CATEGORY_LABELS, safeInferCategory } from "./categories";
import type { ShopOrder, ShopProduct } from "@/server/queries/shop";

export const ACTIVE_SHOP_STATUSES = ["pending_admin", "ordered", "received"] as const;

export type ManagedShopOrder = ShopOrder & {
  category_label: string | null;
  requester_email: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
};

export function shopAgeCategory(birthYear: number | null, seasonYear: number): string | null {
  if (birthYear == null) return null;
  const code = safeInferCategory(birthYear, seasonYear);
  return code ? CATEGORY_LABELS[code] : null;
}

export function isActiveShopOrder(order: Pick<ShopOrder, "status">): boolean {
  return ACTIVE_SHOP_STATUSES.some((status) => status === order.status);
}

export function normalizeShopSearch(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function matchesShopSearch(value: string, query: string): boolean {
  const haystack = normalizeShopSearch(value);
  return normalizeShopSearch(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export function orderSearchText(order: ManagedShopOrder): string {
  return [
    order.requested_by_name,
    order.category_label,
    order.order_reference,
    order.approved_by_name,
    order.contact_phone_e164,
    ...order.items.flatMap((item) => [item.product_title, item.size, item.personalization]),
  ]
    .filter(Boolean)
    .join(" ");
}

export function selectPdfOrders(orders: ManagedShopOrder[], ids?: string[]): ManagedShopOrder[] {
  const active = orders.filter(isActiveShopOrder);
  if (!ids) return active;
  if (ids.length === 0) throw new Error("Selecciona al menos un pedido.");
  const selected = new Set(ids);
  const result = active.filter((order) => selected.has(order.id));
  if (result.length !== selected.size)
    throw new Error(
      "Algún pedido ya no está pendiente. Actualiza la lista y vuelve a seleccionarlo.",
    );
  return result;
}

export function productSearchText(product: ShopProduct): string {
  return [product.title, product.category, ...product.sizes].join(" ");
}

export function shopMoney(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export interface ShopListState {
  view?: string;
  state?: string;
  q?: string;
  category?: string;
  product?: string;
  type?: string;
  filters?: string;
}

export function shopListHref(state: ShopListState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) if (value) params.set(key, value);
  return `/admin/shop${params.size ? `?${params}` : ""}`;
}

export function safeShopReturn(value?: string): string {
  if (!value) return "/admin/shop?view=orders";
  let url: URL;
  try {
    url = new URL(value, "https://morvedre.invalid");
  } catch {
    return "/admin/shop?view=orders";
  }
  return url.origin === "https://morvedre.invalid" && url.pathname === "/admin/shop"
    ? url.pathname + url.search
    : "/admin/shop?view=orders";
}

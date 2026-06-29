export type ShopOrderStatus =
  | "pending_parent"
  | "pending_admin"
  | "rejected"
  | "ordered"
  | "received"
  | "delivered"
  | "cancelled";

export const SHOP_ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending_parent: "Esperando padre",
  pending_admin: "Aprobado por padre",
  rejected: "Rechazado",
  ordered: "Pedido al proveedor",
  received: "Recibido",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const SHOP_KANBAN_COLUMNS: ReadonlyArray<{
  id: ShopOrderStatus;
  title: string;
  emoji: string;
}> = [
  { id: "pending_parent", title: "Esperando padre", emoji: "🟡" },
  { id: "pending_admin", title: "Aprobado por padre", emoji: "🟢" },
  { id: "ordered", title: "Pedido al proveedor", emoji: "📦" },
  { id: "received", title: "Recibido", emoji: "📥" },
  { id: "delivered", title: "Entregado", emoji: "✅" },
];

export const DEFAULT_CURRENCY = "EUR";

export const MAX_CENTS = 99999;
export const MIN_CENTS = 1;
export const MAX_TITLE = 80;
export const MIN_TITLE = 3;
export const MAX_DESCRIPTION = 2000;
export const MIN_DESCRIPTION = 1;
export const MAX_QUANTITY = 20;
export const MIN_QUANTITY = 1;
export const MAX_CATEGORIES_PER_FILTER = 20;
export const MAX_PRICE_FILTER_EUR = 1000;

export interface ParsedProduct {
  ok: boolean;
  error?: string;
  value?: {
    title: string;
    description: string;
    category: string;
    price_cents: number;
    currency: string;
    image_url: string | null;
    sizes: string[];
    available: boolean;
    stock: number | null;
    max_per_order: number;
  };
}

export function parseProduct(input: unknown): ParsedProduct {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Datos inválidos." };
  }
  const v = input as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  if (title.length < MIN_TITLE) return { ok: false, error: "El título es demasiado corto." };
  if (title.length > MAX_TITLE) return { ok: false, error: "Máximo " + MAX_TITLE + " caracteres en el título." };
  const description = typeof v.description === "string" ? v.description.trim() : "";
  if (description.length < MIN_DESCRIPTION) return { ok: false, error: "La descripción no puede estar vacía." };
  if (description.length > MAX_DESCRIPTION) return { ok: false, error: "Máximo " + MAX_DESCRIPTION + " caracteres en la descripción." };
  const category = typeof v.category === "string" ? v.category.trim() : "";
  if (category.length < 1) return { ok: false, error: "La categoría es obligatoria." };
  if (category.length > 40) return { ok: false, error: "La categoría es demasiado larga." };
  const priceEur = typeof v.price_eur === "number" ? v.price_eur : Number.NaN;
  if (!Number.isFinite(priceEur) || priceEur <= 0) {
    return { ok: false, error: "El precio debe ser mayor que 0." };
  }
  if (priceEur > MAX_PRICE_FILTER_EUR) {
    return { ok: false, error: "El precio máximo permitido es " + MAX_PRICE_FILTER_EUR + "€." };
  }
  const priceCents = Math.round(priceEur * 100);
  if (priceCents < MIN_CENTS) return { ok: false, error: "El precio es demasiado bajo." };
  if (priceCents > MAX_CENTS) return { ok: false, error: "El precio es demasiado alto." };
  const currency = typeof v.currency === "string" && v.currency.length > 0 ? v.currency : DEFAULT_CURRENCY;
  if (currency.length > 4) return { ok: false, error: "Moneda inválida." };
  const imageUrl = typeof v.image_url === "string" && v.image_url.length > 0 ? v.image_url : null;
  if (imageUrl && imageUrl.length > 500) return { ok: false, error: "URL de imagen demasiado larga." };
  const sizes = Array.isArray(v.sizes) ? v.sizes.filter((s) => typeof s === "string" && s.length > 0).map((s) => String(s).trim()).filter((s) => s.length > 0 && s.length <= 20) : [];
  const available = v.available === false ? false : true;
  const stock = typeof v.stock === "number" ? Math.floor(v.stock) : null;
  if (stock !== null && (stock < 0 || stock > 1000)) return { ok: false, error: "Stock inválido." };
  const maxPerOrder = typeof v.max_per_order === "number" ? Math.floor(v.max_per_order) : 10;
  if (maxPerOrder < 1 || maxPerOrder > MAX_QUANTITY) {
    return { ok: false, error: "Cantidad máxima por pedido entre 1 y " + MAX_QUANTITY + "." };
  }
  return {
    ok: true,
    value: {
      title,
      description,
      category,
      price_cents: priceCents,
      currency,
      image_url: imageUrl,
      sizes,
      available,
      stock,
      max_per_order: maxPerOrder,
    },
  };
}

export interface ParsedCartItem {
  ok: boolean;
  error?: string;
  value?: { product_id: string; size: string | null; quantity: number };
}

export function parseCartItem(input: unknown): ParsedCartItem {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Datos inválidos." };
  }
  const v = input as Record<string, unknown>;
  const productId = typeof v.product_id === "string" ? v.product_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return { ok: false, error: "Producto inválido." };
  }
  const size = typeof v.size === "string" && v.size.length > 0 ? v.size.trim() : null;
  if (size && size.length > 20) return { ok: false, error: "Talla inválida." };
  const quantity = typeof v.quantity === "number" ? Math.floor(v.quantity) : Number.NaN;
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return { ok: false, error: "Cantidad entre " + MIN_QUANTITY + " y " + MAX_QUANTITY + "." };
  }
  return { ok: true, value: { product_id: productId, size, quantity } };
}

export interface CartLine {
  product_id: string;
  size: string | null;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
}

export interface CartSummary {
  ok: boolean;
  error?: string;
  lines?: CartLine[];
  total_cents?: number;
  item_count?: number;
}

export function summarizeCart(
  items: Array<{ product_id: string; size: string | null; quantity: number }>,
  products: Array<{ id: string; price_cents: number; available: boolean; max_per_order: number }>,
): CartSummary {
  if (items.length === 0) {
    return { ok: false, error: "El carrito está vacío." };
  }
  const productById = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  let total = 0;
  for (const item of items) {
    const product = productById.get(item.product_id);
    if (!product) return { ok: false, error: "Producto no disponible." };
    if (!product.available) return { ok: false, error: "Producto no disponible." };
    if (item.quantity > product.max_per_order) {
      return { ok: false, error: "Cantidad máxima superada para un producto." };
    }
    const subtotal = product.price_cents * item.quantity;
    lines.push({
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
      subtotal_cents: subtotal,
    });
    total += subtotal;
  }
  return { ok: true, lines, total_cents: total, item_count: items.reduce((acc, i) => acc + i.quantity, 0) };
}

export function formatCents(cents: number, currency: string = DEFAULT_CURRENCY): string {
  const euros = cents / 100;
  return euros.toFixed(2) + " " + currency;
}

export function isValidShopOrderStatus(value: unknown): value is ShopOrderStatus {
  return (
    value === "pending_parent" ||
    value === "pending_admin" ||
    value === "rejected" ||
    value === "ordered" ||
    value === "received" ||
    value === "delivered" ||
    value === "cancelled"
  );
}

export const SHOP_LIMITS = {
  MAX_CENTS,
  MIN_CENTS,
  MAX_TITLE,
  MIN_TITLE,
  MAX_DESCRIPTION,
  MIN_DESCRIPTION,
  MAX_QUANTITY,
  MIN_QUANTITY,
} as const;

export type ShopOrderStatus =
  | "pending_parent"
  | "pending_admin"
  | "rejected"
  | "ordered"
  | "received"
  | "delivered"
  | "cancelled";

export function resolveShopContactPhone(input: {
  storedPhone: string | null;
  submittedPhone: string | null;
  deferToGuardian: boolean;
}): string | null {
  if (input.deferToGuardian) return null;
  return input.storedPhone ?? input.submittedPhone;
}

export const SHOP_ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending_parent: "Pendiente de familia",
  pending_admin: "Enviado a tienda",
  rejected: "Rechazado",
  ordered: "Pedido al proveedor",
  received: "Recibido",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export function isMissingShopPersonalizationSchema(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    (error.code === "42703" || error.code === "PGRST204") &&
    (message.includes("personalization_enabled") ||
      message.includes("personalization_label") ||
      message.includes("personalization_max_length") ||
      message.includes("personalization"))
  );
}

export const SHOP_KANBAN_COLUMNS: ReadonlyArray<{
  id: ShopOrderStatus;
  title: string;
  emoji: string;
}> = [
  { id: "pending_parent", title: "Pendiente de familia", emoji: "🟡" },
  { id: "pending_admin", title: "Listo para tienda", emoji: "🟢" },
  { id: "ordered", title: "Pedido al proveedor", emoji: "📦" },
  { id: "received", title: "Recibido", emoji: "📥" },
  { id: "delivered", title: "Entregado", emoji: "✅" },
];

const SHOP_MANAGER_TRANSITIONS: Record<ShopOrderStatus, ReadonlyArray<ShopOrderStatus>> = {
  pending_parent: ["cancelled"],
  pending_admin: ["ordered", "cancelled"],
  ordered: ["received", "cancelled"],
  received: ["delivered", "cancelled"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export function canManagerTransitionShopOrder(
  current: ShopOrderStatus,
  next: ShopOrderStatus,
): boolean {
  return SHOP_MANAGER_TRANSITIONS[current].includes(next);
}

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
    max_per_order: number;
    personalization_enabled: boolean;
    personalization_label: string;
    personalization_max_length: number;
  };
}

export function parseProduct(input: unknown): ParsedProduct {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Datos inválidos." };
  }
  const v = input as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  if (title.length < MIN_TITLE) return { ok: false, error: "El título es demasiado corto." };
  if (title.length > MAX_TITLE)
    return { ok: false, error: "Máximo " + MAX_TITLE + " caracteres en el título." };
  const description = typeof v.description === "string" ? v.description.trim() : "";
  if (description.length < MIN_DESCRIPTION)
    return { ok: false, error: "La descripción no puede estar vacía." };
  if (description.length > MAX_DESCRIPTION)
    return { ok: false, error: "Máximo " + MAX_DESCRIPTION + " caracteres en la descripción." };
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
  const currency =
    typeof v.currency === "string" && v.currency.length > 0 ? v.currency : DEFAULT_CURRENCY;
  if (currency.length > 4) return { ok: false, error: "Moneda inválida." };
  const imageUrl = typeof v.image_url === "string" && v.image_url.length > 0 ? v.image_url : null;
  if (imageUrl && imageUrl.length > 500)
    return { ok: false, error: "URL de imagen demasiado larga." };
  const sizes = Array.isArray(v.sizes)
    ? v.sizes
        .filter((s) => typeof s === "string" && s.length > 0)
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0 && s.length <= 20)
    : [];
  const available = v.available === false ? false : true;
  const maxPerOrder = typeof v.max_per_order === "number" ? Math.floor(v.max_per_order) : 10;
  if (maxPerOrder < 1 || maxPerOrder > MAX_QUANTITY) {
    return { ok: false, error: "Cantidad máxima por pedido entre 1 y " + MAX_QUANTITY + "." };
  }
  const personalizationEnabled = v.personalization_enabled === true;
  const personalizationLabel =
    typeof v.personalization_label === "string" && v.personalization_label.trim().length > 0
      ? v.personalization_label.trim()
      : "Nombre";
  if (personalizationLabel.length > 40) {
    return { ok: false, error: "La etiqueta de personalización es demasiado larga." };
  }
  const personalizationMaxLength =
    typeof v.personalization_max_length === "number"
      ? Math.floor(v.personalization_max_length)
      : 30;
  if (personalizationMaxLength < 1 || personalizationMaxLength > 60) {
    return { ok: false, error: "La personalización debe permitir entre 1 y 60 caracteres." };
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
      max_per_order: maxPerOrder,
      personalization_enabled: personalizationEnabled,
      personalization_label: personalizationLabel,
      personalization_max_length: personalizationMaxLength,
    },
  };
}

export interface ParsedCartItem {
  ok: boolean;
  error?: string;
  value?: {
    product_id: string;
    size: string | null;
    personalization: string | null;
    quantity: number;
  };
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
  const personalization =
    typeof v.personalization === "string" && v.personalization.trim().length > 0
      ? v.personalization.trim()
      : null;
  if (personalization && personalization.length > 60) {
    return { ok: false, error: "La personalización es demasiado larga." };
  }
  const quantity = typeof v.quantity === "number" ? Math.floor(v.quantity) : Number.NaN;
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return { ok: false, error: "Cantidad entre " + MIN_QUANTITY + " y " + MAX_QUANTITY + "." };
  }
  return { ok: true, value: { product_id: productId, size, personalization, quantity } };
}

export interface CartLine {
  product_id: string;
  size: string | null;
  personalization: string | null;
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
  items: Array<{
    product_id: string;
    size: string | null;
    personalization?: string | null;
    quantity: number;
  }>,
  products: Array<{
    id: string;
    title?: string;
    price_cents: number;
    available: boolean;
    max_per_order: number;
    sizes?: string[];
    personalization_enabled?: boolean;
    personalization_max_length?: number;
  }>,
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
    const size = item.size?.trim() || null;
    if (product.sizes && product.sizes.length > 0 && (!size || !product.sizes.includes(size))) {
      return {
        ok: false,
        error: `Selecciona una talla válida para ${product.title ?? "el producto"}.`,
      };
    }
    const personalization = item.personalization?.trim() || null;
    if (product.personalization_enabled && !personalization) {
      return {
        ok: false,
        error: `Escribe la personalización para ${product.title ?? "el producto"}.`,
      };
    }
    if (personalization && personalization.length > (product.personalization_max_length ?? 60)) {
      return {
        ok: false,
        error: `La personalización de ${product.title ?? "el producto"} es demasiado larga.`,
      };
    }
    const subtotal = product.price_cents * item.quantity;
    lines.push({
      product_id: item.product_id,
      size,
      personalization: product.personalization_enabled ? personalization : null,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
      subtotal_cents: subtotal,
    });
    total += subtotal;
  }
  return {
    ok: true,
    lines,
    total_cents: total,
    item_count: items.reduce((acc, i) => acc + i.quantity, 0),
  };
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

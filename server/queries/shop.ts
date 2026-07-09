import { createClient } from "@/lib/supabase/server";
import type { ShopOrderStatus } from "@/lib/domain/shop";

export interface ShopProduct {
  id: string;
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
  created_by: string;
  created_at: string;
  updated_at: string;
  images: ShopProductImage[];
}

export interface ShopProductImage {
  id: string;
  product_id: string;
  url: string;
  storage_path: string | null;
  alt: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  size: string | null;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  product_title?: string;
  product_image_url?: string | null;
  product_category?: string;
}

export interface ShopOrder {
  id: string;
  requested_by: string;
  requested_by_name?: string;
  approved_by: string | null;
  approved_by_name?: string | null;
  managed_by: string | null;
  managed_by_name?: string | null;
  status: ShopOrderStatus;
  total_cents: number;
  currency: string;
  notes: string | null;
  parent_notes: string | null;
  admin_notes: string | null;
  requested_at: string;
  approved_at: string | null;
  ordered_at: string | null;
  received_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  items: ShopOrderItem[];
}

const PRODUCT_FIELDS =
  "id, title, description, category, price_cents, currency, image_url, sizes, available, stock, max_per_order, created_by, created_at, updated_at";

const ORDER_FIELDS =
  "id, requested_by, approved_by, managed_by, status, total_cents, currency, notes, parent_notes, admin_notes, requested_at, approved_at, ordered_at, received_at, delivered_at, cancelled_at, updated_at";

const ITEM_FIELDS = "id, order_id, product_id, size, quantity, unit_price_cents, subtotal_cents";

export async function getShopProducts(filter?: {
  category?: string;
  search?: string;
  availableOnly?: boolean;
}): Promise<ShopProduct[]> {
  const supabase = await createClient();
  let q = supabase
    .from("shop_products")
    .select(PRODUCT_FIELDS)
    .order("created_at", { ascending: false });

  if (filter?.category && filter.category !== "all") {
    q = q.eq("category", filter.category);
  }
  if (filter?.search) {
    q = q.ilike("title", "%" + filter.search + "%");
  }
  if (filter?.availableOnly) {
    q = q.eq("available", true);
  }

  const { data, error } = await q;
  if (error) throw new Error("No pudimos cargar los productos: " + error.message);
  return attachProductImages((data ?? []) as Array<Omit<ShopProduct, "images">>, supabase);
}

export async function getShopProduct(productId: string): Promise<ShopProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(PRODUCT_FIELDS)
    .eq("id", productId)
    .maybeSingle();
  if (error) return null;
  const products = await attachProductImages(
    data ? [data as Omit<ShopProduct, "images">] : [],
    supabase,
  );
  return products[0] ?? null;
}

export async function getShopCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_products").select("category").order("category");
  if (error) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const r of data ?? []) {
    const c = (r as { category: string }).category;
    if (!seen.has(c)) {
      seen.add(c);
      list.push(c);
    }
  }
  return list;
}

async function attachProductImages(
  products: Array<Omit<ShopProduct, "images">>,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ShopProduct[]> {
  if (products.length === 0) return [];
  const productIds = products.map((p) => p.id);
  const { data } = await (
    supabase as unknown as {
      from: (table: "shop_product_images") => {
        select: (fields: string) => {
          in: (
            column: string,
            values: string[],
          ) => {
            order: (
              column: string,
              options?: { ascending?: boolean },
            ) => Promise<{ data: unknown[] | null }>;
          };
        };
      };
    }
  )
    .from("shop_product_images")
    .select("id, product_id, url, storage_path, alt, sort_order, is_cover, created_at")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  const byProduct = new Map<string, ShopProductImage[]>();
  for (const row of (data ?? []) as ShopProductImage[]) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  return products.map((product) => {
    const images = byProduct.get(product.id) ?? [];
    const normalizedImages =
      images.length > 0
        ? images
        : product.image_url
          ? [
              {
                id: `legacy-${product.id}`,
                product_id: product.id,
                url: product.image_url,
                storage_path: null,
                alt: product.title,
                sort_order: 0,
                is_cover: true,
                created_at: product.created_at,
              },
            ]
          : [];
    const cover = normalizedImages.find((image) => image.is_cover) ?? normalizedImages[0] ?? null;
    return {
      ...product,
      image_url: cover?.url ?? product.image_url,
      images: normalizedImages,
    };
  });
}

export async function getShopOrder(orderId: string): Promise<ShopOrder | null> {
  const supabase = await createClient();
  const { data: orderData, error: orderErr } = await supabase
    .from("shop_orders")
    .select(ORDER_FIELDS)
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) return null;
  if (!orderData) return null;

  const { data: itemsData, error: itemsErr } = await supabase
    .from("shop_order_items")
    .select(ITEM_FIELDS)
    .eq("order_id", orderId);
  if (itemsErr) return null;

  const items = await hydrateOrderItems(itemsData ?? [], supabase);
  const profileMap = await loadProfileNames(supabase, collectProfileIdsFromOrders([orderData]));

  return assembleOrder(orderData, items, profileMap);
}

export async function getShopOrdersForPlayer(profileId: string): Promise<ShopOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select(ORDER_FIELDS)
    .eq("requested_by", profileId)
    .order("requested_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return hydrateOrders(data ?? [], supabase);
}

export async function getPendingShopOrdersForParent(parentId: string): Promise<ShopOrder[]> {
  const supabase = await createClient();
  const { data: links, error: linkErr } = await supabase
    .from("parent_child_links")
    .select("child_profile_id")
    .eq("parent_profile_id", parentId);
  if (linkErr) return [];
  const childIds = (links ?? []).map((l) => (l as { child_profile_id: string }).child_profile_id);
  if (childIds.length === 0) return [];

  const { data, error } = await supabase
    .from("shop_orders")
    .select(ORDER_FIELDS)
    .in("requested_by", childIds)
    .eq("status", "pending_parent")
    .order("requested_at", { ascending: true });
  if (error) return [];
  return hydrateOrders(data ?? [], supabase);
}

export async function getShopOrdersForKanban(statuses: ShopOrderStatus[]): Promise<ShopOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select(ORDER_FIELDS)
    .in("status", statuses)
    .order("requested_at", { ascending: false });
  if (error) return [];
  return hydrateOrders(data ?? [], supabase);
}

async function hydrateOrders(
  orderRows: Array<Record<string, unknown>>,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ShopOrder[]> {
  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((o) => (o as { id: string }).id);

  const { data: itemsData, error: itemsErr } = await supabase
    .from("shop_order_items")
    .select(ITEM_FIELDS)
    .in("order_id", orderIds);
  if (itemsErr) return [];

  const items = await hydrateOrderItems(itemsData ?? [], supabase);
  const itemsByOrder = new Map<string, ShopOrderItem[]>();
  for (const it of items) {
    const list = itemsByOrder.get(it.order_id) ?? [];
    list.push(it);
    itemsByOrder.set(it.order_id, list);
  }

  const profileMap = await loadProfileNames(supabase, collectProfileIdsFromOrders(orderRows));

  return orderRows.map((order) =>
    assembleOrder(order, itemsByOrder.get((order as { id: string }).id) ?? [], profileMap),
  );
}

async function hydrateOrderItems(
  itemRows: Array<Record<string, unknown>>,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ShopOrderItem[]> {
  if (itemRows.length === 0) return [];
  const productIds = Array.from(
    new Set(itemRows.map((i) => (i as { product_id: string }).product_id)),
  );
  const { data: productsData } = productIds.length
    ? await supabase
        .from("shop_products")
        .select("id, title, image_url, category")
        .in("id", productIds)
    : {
        data: [] as Array<{
          id: string;
          title: string;
          image_url: string | null;
          category: string;
        }>,
      };
  const productMap = new Map(
    (
      (productsData ?? []) as Array<{
        id: string;
        title: string;
        image_url: string | null;
        category: string;
      }>
    ).map((p) => [p.id, p]),
  );

  return (
    itemRows as Array<{
      id: string;
      order_id: string;
      product_id: string;
      size: string | null;
      quantity: number;
      unit_price_cents: number;
      subtotal_cents: number;
    }>
  ).map((i) => {
    const p = productMap.get(i.product_id);
    return {
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id,
      size: i.size,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
      subtotal_cents: i.subtotal_cents,
      product_title: p?.title,
      product_image_url: p?.image_url ?? null,
      product_category: p?.category,
    };
  });
}

function collectProfileIdsFromOrders(orders: Array<Record<string, unknown>>): string[] {
  const ids = new Set<string>();
  for (const o of orders) {
    const ord = o as {
      requested_by: string;
      approved_by: string | null;
      managed_by: string | null;
    };
    ids.add(ord.requested_by);
    if (ord.approved_by) ids.add(ord.approved_by);
    if (ord.managed_by) ids.add(ord.managed_by);
  }
  return Array.from(ids);
}

async function loadProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileIds: string[],
): Promise<Map<string, string>> {
  if (profileIds.length === 0) return new Map();
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);
  return new Map(
    ((profilesData ?? []) as Array<{ id: string; full_name: string }>).map((p) => [
      p.id,
      p.full_name,
    ]),
  );
}

function assembleOrder(
  orderRow: Record<string, unknown>,
  items: ShopOrderItem[],
  profileMap: Map<string, string>,
): ShopOrder {
  const o = orderRow as {
    id: string;
    requested_by: string;
    approved_by: string | null;
    managed_by: string | null;
    status: ShopOrderStatus;
    total_cents: number;
    currency: string;
    notes: string | null;
    parent_notes: string | null;
    admin_notes: string | null;
    requested_at: string;
    approved_at: string | null;
    ordered_at: string | null;
    received_at: string | null;
    delivered_at: string | null;
    cancelled_at: string | null;
    updated_at: string;
  };
  return {
    id: o.id,
    requested_by: o.requested_by,
    requested_by_name: profileMap.get(o.requested_by),
    approved_by: o.approved_by,
    approved_by_name: o.approved_by ? (profileMap.get(o.approved_by) ?? null) : null,
    managed_by: o.managed_by,
    managed_by_name: o.managed_by ? (profileMap.get(o.managed_by) ?? null) : null,
    status: o.status,
    total_cents: o.total_cents,
    currency: o.currency,
    notes: o.notes,
    parent_notes: o.parent_notes,
    admin_notes: o.admin_notes,
    requested_at: o.requested_at,
    approved_at: o.approved_at,
    ordered_at: o.ordered_at,
    received_at: o.received_at,
    delivered_at: o.delivered_at,
    cancelled_at: o.cancelled_at,
    updated_at: o.updated_at,
    items,
  };
}

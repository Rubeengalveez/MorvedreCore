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

export async function getShopProducts(filter?: {
  category?: string;
  search?: string;
  availableOnly?: boolean;
}): Promise<ShopProduct[]> {
  const supabase = await createClient();
  let q = supabase
    .from("shop_products")
    .select(
      "id, title, description, category, price_cents, currency, image_url, sizes, available, stock, max_per_order, created_by, created_at, updated_at",
    )
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
  return (data ?? []) as ShopProduct[];
}

export async function getShopProduct(
  productId: string,
): Promise<ShopProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(
      "id, title, description, category, price_cents, currency, image_url, sizes, available, stock, max_per_order, created_by, created_at, updated_at",
    )
    .eq("id", productId)
    .maybeSingle();
  if (error) return null;
  return (data as ShopProduct | null) ?? null;
}

export async function getShopCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select("category")
    .order("category");
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

export async function getShopOrder(
  orderId: string,
): Promise<ShopOrder | null> {
  const supabase = await createClient();
  const { data: orderData, error: orderErr } = await supabase
    .from("shop_orders")
    .select(
      "id, requested_by, approved_by, managed_by, status, total_cents, currency, notes, parent_notes, admin_notes, requested_at, approved_at, ordered_at, received_at, delivered_at, cancelled_at, updated_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) return null;
  if (!orderData) return null;

  const { data: itemsData, error: itemsErr } = await supabase
    .from("shop_order_items")
    .select(
      "id, order_id, product_id, size, quantity, unit_price_cents, subtotal_cents",
    )
    .eq("order_id", orderId);
  if (itemsErr) return null;

  const productIds = (itemsData ?? []).map((i) => (i as { product_id: string }).product_id);
  const { data: productsData } = productIds.length
    ? await supabase
        .from("shop_products")
        .select("id, title, image_url, category")
        .in("id", productIds)
    : { data: [] };
  const productMap = new Map(
    ((productsData ?? []) as Array<{
      id: string;
      title: string;
      image_url: string | null;
      category: string;
    }>).map((p) => [p.id, p]),
  );

  const items: ShopOrderItem[] = ((itemsData ?? []) as Array<{
    id: string;
    order_id: string;
    product_id: string;
    size: string | null;
    quantity: number;
    unit_price_cents: number;
    subtotal_cents: number;
  }>).map((i) => {
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

  const profileIds = [
    (orderData as { requested_by: string }).requested_by,
    (orderData as { approved_by: string | null }).approved_by,
    (orderData as { managed_by: string | null }).managed_by,
  ].filter(Boolean) as string[];
  const { data: profilesData } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds)
    : { data: [] };
  const profileMap = new Map(
    ((profilesData ?? []) as Array<{ id: string; full_name: string }>).map(
      (p) => [p.id, p.full_name],
    ),
  );

  return {
    id: (orderData as { id: string }).id,
    requested_by: (orderData as { requested_by: string }).requested_by,
    requested_by_name: profileMap.get(
      (orderData as { requested_by: string }).requested_by,
    ),
    approved_by: (orderData as { approved_by: string | null }).approved_by,
    approved_by_name:
      (orderData as { approved_by: string | null }).approved_by !== null
        ? profileMap.get(
            (orderData as { approved_by: string }).approved_by,
          ) ?? null
        : null,
    managed_by: (orderData as { managed_by: string | null }).managed_by,
    managed_by_name:
      (orderData as { managed_by: string | null }).managed_by !== null
        ? profileMap.get(
            (orderData as { managed_by: string }).managed_by,
          ) ?? null
        : null,
    status: (orderData as { status: ShopOrderStatus }).status,
    total_cents: (orderData as { total_cents: number }).total_cents,
    currency: (orderData as { currency: string }).currency,
    notes: (orderData as { notes: string | null }).notes,
    parent_notes: (orderData as { parent_notes: string | null }).parent_notes,
    admin_notes: (orderData as { admin_notes: string | null }).admin_notes,
    requested_at: (orderData as { requested_at: string }).requested_at,
    approved_at: (orderData as { approved_at: string | null }).approved_at,
    ordered_at: (orderData as { ordered_at: string | null }).ordered_at,
    received_at: (orderData as { received_at: string | null }).received_at,
    delivered_at: (orderData as { delivered_at: string | null }).delivered_at,
    cancelled_at: (orderData as { cancelled_at: string | null }).cancelled_at,
    updated_at: (orderData as { updated_at: string }).updated_at,
    items,
  };
}

export async function getShopOrdersForPlayer(
  profileId: string,
): Promise<ShopOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("id")
    .eq("requested_by", profileId)
    .order("requested_at", { ascending: false })
    .limit(50);
  if (error) return [];
  const orders: ShopOrder[] = [];
  for (const o of data ?? []) {
    const full = await getShopOrder((o as { id: string }).id);
    if (full) orders.push(full);
  }
  return orders;
}

export async function getPendingShopOrdersForParent(
  parentId: string,
): Promise<ShopOrder[]> {
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
    .select("id")
    .in("requested_by", childIds)
    .eq("status", "pending_parent")
    .order("requested_at", { ascending: true });
  if (error) return [];
  const orders: ShopOrder[] = [];
  for (const o of data ?? []) {
    const full = await getShopOrder((o as { id: string }).id);
    if (full) orders.push(full);
  }
  return orders;
}

export async function getShopOrdersForKanban(
  statuses: ShopOrderStatus[],
): Promise<ShopOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("id")
    .in("status", statuses)
    .order("requested_at", { ascending: false });
  if (error) return [];
  const orders: ShopOrder[] = [];
  for (const o of data ?? []) {
    const full = await getShopOrder((o as { id: string }).id);
    if (full) orders.push(full);
  }
  return orders;
}

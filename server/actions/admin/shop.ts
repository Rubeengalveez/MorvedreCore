"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { insertNotificationsWithPush } from "./notification-dispatch";
import { requireAdmin, requireSessionProfile } from "./_helpers";
import {
  createShopOrderSchema,
  decideShopOrderSchema,
  deleteShopProductSchema,
  updateShopOrderStatusSchema,
  updateShopProductSchema,
  upsertShopProductSchema,
} from "@/lib/domain/admin-schemas";
import {
  isValidShopOrderStatus,
  parseProduct,
  summarizeCart,
  type ShopOrderStatus,
} from "@/lib/domain/shop";

function toError(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Datos inválidos.";
  if (e instanceof Error) return e.message;
  return "Ha habido un problema.";
}

async function uploadShopImage(
  productId: string,
  file: File,
  index = 0,
): Promise<{ url: string; path: string }> {
  const admin = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `shop/${productId}/${Date.now()}-${index}.${ext}`;
  const { error } = await admin.storage
    .from("shop-images")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error("No pudimos subir la imagen: " + error.message);
  const { data: pub } = admin.storage.from("shop-images").getPublicUrl(path);
  return { url: pub.publicUrl, path };
}

async function replaceProductImages(input: {
  productId: string;
  title: string;
  files: File[];
  coverIndex: number;
}): Promise<string | null> {
  if (input.files.length === 0) return null;
  const admin = createAdminClient();
  const coverIndex = Math.max(0, Math.min(input.coverIndex, input.files.length - 1));
  await (
    admin as unknown as {
      from: (table: "shop_product_images") => {
        delete: () => { eq: (column: string, value: string) => Promise<{ error: Error | null }> };
        insert: (rows: unknown[]) => Promise<{ error: Error | null }>;
      };
    }
  )
    .from("shop_product_images")
    .delete()
    .eq("product_id", input.productId);

  const uploaded = [];
  for (const [index, file] of input.files.entries()) {
    uploaded.push(await uploadShopImage(input.productId, file, index));
  }

  const rows = uploaded.map((image, index) => ({
    product_id: input.productId,
    url: image.url,
    storage_path: image.path,
    alt: input.title,
    sort_order: index,
    is_cover: index === coverIndex,
  }));
  const { error } = await (
    admin as unknown as {
      from: (table: "shop_product_images") => {
        insert: (rows: unknown[]) => Promise<{ error: Error | null }>;
      };
    }
  )
    .from("shop_product_images")
    .insert(rows);
  if (error) throw new Error("No pudimos guardar la galeria: " + error.message);
  return uploaded[coverIndex]?.url ?? uploaded[0]?.url ?? null;
}

export async function createShopProduct(input: {
  title: string;
  description: string;
  category: string;
  price_eur: number;
  image_url?: string | null;
  sizes?: string[];
  available?: boolean;
  stock?: number | null;
  max_per_order?: number;
  imageFile?: File | null;
  imageFiles?: File[] | null;
  coverImageIndex?: number;
}): Promise<{ id: string }> {
  await requireAdmin();
  const parsed = upsertShopProductSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const product = parseProduct(parsed.data);
  if (!product.ok) throw new Error(product.error ?? "Datos inválidos.");

  const me = await requireSessionProfile();
  const admin = createAdminClient();

  const { data: created, error } = await admin
    .from("shop_products")
    .insert({
      title: product.value!.title,
      description: product.value!.description,
      category: product.value!.category,
      price_cents: product.value!.price_cents,
      currency: product.value!.currency,
      image_url: product.value!.image_url,
      sizes: product.value!.sizes,
      available: product.value!.available,
      stock: product.value!.stock,
      max_per_order: product.value!.max_per_order,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error) throw new Error("No pudimos crear el producto: " + error.message);

  const files = input.imageFiles?.length
    ? input.imageFiles
    : input.imageFile
      ? [input.imageFile]
      : [];
  if (files.length > 0) {
    const coverUrl = await replaceProductImages({
      productId: created.id,
      title: product.value!.title,
      files,
      coverIndex: input.coverImageIndex ?? 0,
    });
    if (coverUrl) {
      await admin.from("shop_products").update({ image_url: coverUrl }).eq("id", created.id);
    }
  }

  revalidatePath("/shop");
  revalidatePath("/admin/shop");
  revalidatePath("/dashboard");
  return { id: created.id };
}

export async function updateShopProduct(input: {
  product_id: string;
  title: string;
  description: string;
  category: string;
  price_eur: number;
  image_url?: string | null;
  sizes?: string[];
  available?: boolean;
  stock?: number | null;
  max_per_order?: number;
  imageFile?: File | null;
  imageFiles?: File[] | null;
  coverImageIndex?: number;
}): Promise<void> {
  await requireAdmin();
  const parsed = updateShopProductSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const product = parseProduct(parsed.data);
  if (!product.ok) throw new Error(product.error ?? "Datos inválidos.");

  const admin = createAdminClient();
  let imageUrl = product.value!.image_url ?? null;
  const files = input.imageFiles?.length
    ? input.imageFiles
    : input.imageFile
      ? [input.imageFile]
      : [];
  if (files.length > 0) {
    imageUrl = await replaceProductImages({
      productId: input.product_id,
      title: product.value!.title,
      files,
      coverIndex: input.coverImageIndex ?? 0,
    });
  }

  const { error } = await admin
    .from("shop_products")
    .update({
      title: product.value!.title,
      description: product.value!.description,
      category: product.value!.category,
      price_cents: product.value!.price_cents,
      currency: product.value!.currency,
      image_url: imageUrl,
      sizes: product.value!.sizes,
      available: product.value!.available,
      stock: product.value!.stock,
      max_per_order: product.value!.max_per_order,
    })
    .eq("id", input.product_id);

  if (error) throw new Error("No pudimos actualizar el producto: " + error.message);
  revalidatePath("/shop");
  revalidatePath(`/shop/${input.product_id}`);
  revalidatePath("/admin/shop");
}

export async function deleteShopProduct(input: { product_id: string }): Promise<void> {
  await requireAdmin();
  const parsed = deleteShopProductSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const admin = createAdminClient();
  const { error } = await admin.from("shop_products").delete().eq("id", input.product_id);
  if (error) throw new Error("No pudimos eliminar el producto: " + error.message);
  revalidatePath("/shop");
  revalidatePath("/admin/shop");
}

export async function updateShopOrderStatus(input: {
  order_id: string;
  status: ShopOrderStatus;
  admin_notes?: string | null;
}): Promise<void> {
  await requireAdmin();
  const parsed = updateShopOrderStatusSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  if (!isValidShopOrderStatus(parsed.data.status)) {
    throw new Error("Estado de pedido inválido.");
  }

  const me = await requireSessionProfile();
  const admin = createAdminClient();

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    admin_notes: parsed.data.admin_notes ?? null,
    managed_by: me.id,
    updated_at: now,
  };
  if (parsed.data.status === "ordered") updates.ordered_at = now;
  if (parsed.data.status === "received") updates.received_at = now;
  if (parsed.data.status === "delivered") updates.delivered_at = now;
  if (parsed.data.status === "cancelled") updates.cancelled_at = now;

  const { error } = await admin
    .from("shop_orders")
    .update(updates as never)
    .eq("id", parsed.data.order_id);
  if (error) throw new Error("No pudimos actualizar el pedido: " + error.message);
  revalidatePath("/admin/shop");
  revalidatePath(`/shop/orders/${parsed.data.order_id}`);
  revalidatePath("/dashboard");
}

export async function createShopOrder(input: {
  items: Array<{ product_id: string; size: string | null; quantity: number }>;
  notes?: string | null;
}): Promise<{ id: string }> {
  const me = await requireSessionProfile();
  const parsed = createShopOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const productIds = Array.from(new Set(parsed.data.items.map((i) => i.product_id)));
  const { data: products, error: pErr } = await supabase
    .from("shop_products")
    .select("id, price_cents, available, max_per_order, title")
    .in("id", productIds);
  if (pErr) throw new Error("No pudimos cargar los productos: " + pErr.message);
  if (!products || products.length !== productIds.length) {
    throw new Error("Uno o más productos no existen.");
  }

  const cart = summarizeCart(
    parsed.data.items.map((i) => ({
      product_id: i.product_id,
      size: i.size ?? null,
      quantity: i.quantity,
    })),
    products,
  );
  if (!cart.ok) throw new Error(cart.error ?? "Carrito inválido.");

  const admin = createAdminClient();
  const { data: order, error: oErr } = await admin
    .from("shop_orders")
    .insert({
      requested_by: me.id,
      status: "pending_parent",
      total_cents: cart.total_cents!,
      currency: "EUR",
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (oErr) throw new Error("No pudimos crear el pedido: " + oErr.message);

  const items = cart.lines!.map((line) => ({
    order_id: order.id,
    product_id: line.product_id,
    size: line.size,
    quantity: line.quantity,
    unit_price_cents: line.unit_price_cents,
    subtotal_cents: line.subtotal_cents,
  }));
  const { error: iErr } = await admin.from("shop_order_items").insert(items as never);
  if (iErr) {
    await admin.from("shop_orders").delete().eq("id", order.id);
    throw new Error("No pudimos guardar los productos del pedido: " + iErr.message);
  }

  await notifyParentsOfOrder(order.id, me.id, products);

  revalidatePath("/shop");
  revalidatePath("/shop/orders");
  revalidatePath(`/shop/orders/${order.id}`);
  revalidatePath("/dashboard");
  return { id: order.id };
}

export async function decideShopOrder(input: {
  order_id: string;
  decision: "approve" | "reject";
  parent_notes?: string | null;
}): Promise<void> {
  const me = await requireSessionProfile();
  const parsed = decideShopOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    status: parsed.data.decision === "approve" ? "pending_admin" : "rejected",
    approved_by: me.id,
    approved_at: now,
    parent_notes: parsed.data.parent_notes ?? null,
    updated_at: now,
  };
  if (parsed.data.decision === "reject") updates.cancelled_at = now;

  const { error } = await admin
    .from("shop_orders")
    .update(updates as never)
    .eq("id", parsed.data.order_id);
  if (error) throw new Error("No pudimos actualizar el pedido: " + error.message);

  revalidatePath(`/shop/orders/${parsed.data.order_id}`);
  revalidatePath("/shop/parents/pending");
  revalidatePath("/admin/shop");
}

async function notifyParentsOfOrder(
  orderId: string,
  childId: string,
  products: Array<{ id: string; title: string }>,
): Promise<void> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("parent_profile_id")
    .eq("child_profile_id", childId);
  if (!links || links.length === 0) return;

  const productTitles = products.map((p) => p.title).join(", ");
  const rows = links.map((l) => ({
    recipient_id: l.parent_profile_id,
    kind: "news_pinned" as const,
    title: "Solicitud de compra",
    body: `Tu hijo/a quiere comprar: ${productTitles}`,
    href: `/shop/orders/${orderId}`,
    related_match_id: null,
  }));
  await insertNotificationsWithPush(rows);
}

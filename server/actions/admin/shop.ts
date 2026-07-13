"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
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
  isMissingShopPersonalizationSchema,
  parseProduct,
  summarizeCart,
  type ShopOrderStatus,
} from "@/lib/domain/shop";
import { validateImageFile } from "@/lib/uploads/images";

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
  const image = await validateImageFile(file);
  const path = `shop/${productId}/${Date.now()}-${index}.${image.extension}`;
  const { error } = await admin.storage
    .from("shop-images")
    .upload(path, file, { contentType: image.contentType, upsert: true });
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
  personalization_enabled?: boolean;
  personalization_label?: string;
  personalization_max_length?: number;
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

  const baseProduct = {
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
  };
  let createResult = await admin
    .from("shop_products")
    .insert({
      ...baseProduct,
      personalization_enabled: product.value!.personalization_enabled,
      personalization_label: product.value!.personalization_label,
      personalization_max_length: product.value!.personalization_max_length,
    })
    .select("id")
    .single();
  if (isMissingShopPersonalizationSchema(createResult.error)) {
    createResult = await admin.from("shop_products").insert(baseProduct).select("id").single();
  }
  if (createResult.error) {
    throw new Error("No pudimos crear el producto: " + createResult.error.message);
  }
  const created = createResult.data;

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
  personalization_enabled?: boolean;
  personalization_label?: string;
  personalization_max_length?: number;
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

  const baseUpdates = {
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
  };
  let updateResult = await admin
    .from("shop_products")
    .update({
      ...baseUpdates,
      personalization_enabled: product.value!.personalization_enabled,
      personalization_label: product.value!.personalization_label,
      personalization_max_length: product.value!.personalization_max_length,
    })
    .eq("id", input.product_id);
  if (isMissingShopPersonalizationSchema(updateResult.error)) {
    updateResult = await admin.from("shop_products").update(baseUpdates).eq("id", input.product_id);
  }
  if (updateResult.error) {
    throw new Error("No pudimos actualizar el producto: " + updateResult.error.message);
  }
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
  items: Array<{
    product_id: string;
    size: string | null;
    personalization: string | null;
    quantity: number;
  }>;
  notes?: string | null;
}): Promise<{ id: string }> {
  const me = await requireSessionProfile();
  const parsed = createShopOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const productIds = Array.from(new Set(parsed.data.items.map((i) => i.product_id)));
  let supportsPersonalization = true;
  const currentProductResult = await supabase
    .from("shop_products")
    .select(
      "id, price_cents, available, max_per_order, title, sizes, personalization_enabled, personalization_max_length",
    )
    .in("id", productIds);
  let productRows = currentProductResult.data as unknown as Array<Record<string, unknown>> | null;
  let productError = currentProductResult.error;
  if (isMissingShopPersonalizationSchema(productError)) {
    supportsPersonalization = false;
    const legacyProductResult = await supabase
      .from("shop_products")
      .select("id, price_cents, available, max_per_order, title, sizes")
      .in("id", productIds);
    productRows = legacyProductResult.data as unknown as Array<Record<string, unknown>> | null;
    productError = legacyProductResult.error;
  }
  if (productError) {
    throw new Error("No pudimos cargar los productos: " + productError.message);
  }
  const products = (productRows ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    price_cents: Number(row.price_cents),
    available: Boolean(row.available),
    max_per_order: Number(row.max_per_order),
    sizes: Array.isArray(row.sizes) ? row.sizes.map(String) : [],
    personalization_enabled:
      "personalization_enabled" in row && Boolean(row.personalization_enabled),
    personalization_max_length:
      "personalization_max_length" in row && typeof row.personalization_max_length === "number"
        ? row.personalization_max_length
        : 30,
  }));
  if (!products || products.length !== productIds.length) {
    throw new Error("Uno o más productos no existen.");
  }

  const cart = summarizeCart(
    parsed.data.items.map((i) => ({
      product_id: i.product_id,
      size: i.size ?? null,
      personalization: supportsPersonalization ? (i.personalization ?? null) : null,
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
    personalization: line.personalization,
    quantity: line.quantity,
    unit_price_cents: line.unit_price_cents,
    subtotal_cents: line.subtotal_cents,
  }));
  let itemsResult = await admin.from("shop_order_items").insert(items as never);
  if (isMissingShopPersonalizationSchema(itemsResult.error)) {
    itemsResult = await admin
      .from("shop_order_items")
      .insert(items.map(({ personalization: _personalization, ...item }) => item) as never);
  }
  if (itemsResult.error) {
    await admin.from("shop_orders").delete().eq("id", order.id);
    throw new Error("No pudimos guardar los productos del pedido: " + itemsResult.error.message);
  }

  await notifyParentsOfOrder(order.id, me.id, products);
  await notifyShopManagerOfOrder(order.id, me.id, cart.lines!, products);

  revalidatePath("/shop");
  revalidatePath("/shop/orders");
  revalidatePath(`/shop/orders/${order.id}`);
  revalidatePath("/dashboard");
  return { id: order.id };
}

async function notifyShopManagerOfOrder(
  orderId: string,
  requesterId: string,
  lines: Array<{
    product_id: string;
    size: string | null;
    personalization: string | null;
    quantity: number;
  }>,
  products: Array<{ id: string; title: string }>,
): Promise<void> {
  const managerEmail =
    process.env.SHOP_MANAGER_EMAIL ?? process.env.ADMIN_EMAIL ?? "galvillo9@gmail.com";
  const admin = createAdminClient();
  const { data: requester } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", requesterId)
    .maybeSingle();
  const productById = new Map(products.map((product) => [product.id, product.title]));
  const detail = lines
    .map((line) => {
      const options = [
        line.size ? `talla ${line.size}` : null,
        line.personalization ? `personalización: ${line.personalization}` : null,
      ].filter(Boolean);
      return `- ${productById.get(line.product_id) ?? "Producto"}${options.length > 0 ? ` (${options.join(", ")})` : ""}`;
    })
    .join("\n");

  await sendEmail({
    to: managerEmail,
    subject: `Nueva solicitud de tienda · ${requester?.full_name ?? "Socio/a"}`,
    text: `Nueva solicitud de material en Morvedre Core.

Solicitante: ${requester?.full_name ?? requesterId}
Pedido: ${orderId}

${detail}

Puedes gestionarlo desde /admin/shop.
`,
  });
}

export async function decideShopOrder(input: {
  order_id: string;
  decision: "approve" | "reject";
  parent_notes?: string | null;
}): Promise<void> {
  const me = await requireSessionProfile();
  const parsed = decideShopOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("shop_orders")
    .select("requested_by, status")
    .eq("id", parsed.data.order_id)
    .maybeSingle();
  if (!order || order.status !== "pending_parent") {
    throw new Error("El pedido no existe o ya no está pendiente.");
  }

  const [{ data: parentLink }, { data: adminRole }] = await Promise.all([
    supabase
      .from("parent_child_links")
      .select("parent_profile_id")
      .eq("parent_profile_id", me.id)
      .eq("child_profile_id", order.requested_by)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", me.id)
      .eq("role", "admin")
      .is("scope_team_id", null)
      .maybeSingle(),
  ]);
  if (!parentLink && !adminRole) {
    throw new Error("Solo su familia puede decidir este pedido.");
  }

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
    .eq("id", parsed.data.order_id)
    .eq("status", "pending_parent");
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

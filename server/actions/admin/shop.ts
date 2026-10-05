"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyShopOrder } from "@/server/shop-email";
import { scheduleNotificationPush } from "@/server/notification-push";
import { requirePermission, requireSessionProfile } from "./_helpers";
import {
  createShopOrderSchema,
  decideShopOrderSchema,
  deleteShopProductSchema,
  updateShopOrderStatusSchema,
  updateShopProductSchema,
  upsertShopProductSchema,
} from "@/lib/domain/admin-schemas";
import {
  canManagerTransitionShopOrder,
  isValidShopOrderStatus,
  isMissingShopPersonalizationSchema,
  parseProduct,
  resolveShopContactPhone,
  type ShopOrderStatus,
} from "@/lib/domain/shop";
import { validateImageFile } from "@/lib/uploads/images";
import { normalizeSpanishPhone } from "@/lib/domain/phone";
import { requiresGuardianApproval } from "@/lib/domain/family";

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
  const path = `shop/${productId}/${crypto.randomUUID()}-${index}.${image.extension}`;
  const { error } = await admin.storage
    .from("shop-images")
    .upload(path, file, { contentType: image.contentType, upsert: true });
  if (error) throw new Error("No pudimos subir la imagen: " + error.message);
  const { data: pub } = admin.storage.from("shop-images").getPublicUrl(path);
  return { url: pub.publicUrl, path };
}

type GalleryEntry = { imageId: string } | { fileIndex: number };
const gallerySchema = z
  .array(
    z.union([
      z.object({ imageId: z.string().regex(/^(?:[a-f0-9-]{36}|legacy-[a-f0-9-]{36})$/i) }).strict(),
      z.object({ fileIndex: z.number().int().min(0).max(7) }).strict(),
    ]),
  )
  .max(8);

async function replaceProductImages(input: {
  productId: string;
  title: string;
  files: File[];
  coverIndex: number;
  galleryOrder?: GalleryEntry[];
}): Promise<string | null> {
  const admin = createAdminClient();
  const order = gallerySchema.parse(
    input.galleryOrder ?? input.files.map((_, fileIndex) => ({ fileIndex })),
  );
  if (input.files.length > 8) throw new Error("Elige como máximo 8 fotos.");
  for (const file of input.files) await validateImageFile(file);
  const { data: previous, error: previousError } = await admin
    .from("shop_product_images")
    .select("id,url,storage_path")
    .eq("product_id", input.productId);
  if (previousError) throw new Error("No pudimos comprobar las fotos actuales.");
  const existing = new Map((previous ?? []).map((image) => [image.id, image]));
  if (order.some((entry) => "imageId" in entry && entry.imageId === `legacy-${input.productId}`)) {
    const { data: product, error } = await admin
      .from("shop_products")
      .select("image_url")
      .eq("id", input.productId)
      .single();
    if (error || !product?.image_url || existing.size)
      throw new Error("Las fotos han cambiado. Vuelve a abrir el producto.");
    existing.set(`legacy-${input.productId}`, {
      id: `legacy-${input.productId}`,
      url: product.image_url,
      storage_path: null,
    });
  }
  const keys = order.map((entry) =>
    "imageId" in entry ? entry.imageId : `file-${entry.fileIndex}`,
  );
  if (
    new Set(keys).size !== keys.length ||
    order.filter((entry) => "fileIndex" in entry).length !== input.files.length ||
    order.some((entry) =>
      "imageId" in entry ? !existing.has(entry.imageId) : !input.files[entry.fileIndex],
    )
  )
    throw new Error("Las fotos han cambiado. Vuelve a abrir el producto.");
  const uploaded: Array<{ url: string; path: string }> = [];
  let rows: Array<{
    url: string;
    storage_path: string | null;
    alt: string;
    sort_order: number;
    is_cover: boolean;
  }> = [];
  try {
    for (const [index, file] of input.files.entries())
      uploaded.push(await uploadShopImage(input.productId, file, index));
    rows = order.map((entry, index) => {
      const image =
        "imageId" in entry
          ? existing.get(entry.imageId)!
          : { url: uploaded[entry.fileIndex].url, storage_path: uploaded[entry.fileIndex].path };
      return {
        url: image.url,
        storage_path: image.storage_path,
        alt: input.title,
        sort_order: index,
        is_cover: index === 0,
      };
    });
    const { error } = await admin.rpc("replace_shop_product_gallery", {
      p_product_id: input.productId,
      p_images: rows,
    });
    if (error) throw new Error("No pudimos guardar las fotos. Las anteriores se conservan.");
  } catch (error) {
    if (uploaded.length)
      await admin.storage.from("shop-images").remove(uploaded.map((image) => image.path));
    throw error;
  }
  const kept = new Set(rows.map((image) => image.storage_path));
  const removed = (previous ?? []).flatMap((image) =>
    image.storage_path && !kept.has(image.storage_path) ? [image.storage_path] : [],
  );
  if (removed.length) await admin.storage.from("shop-images").remove(removed);
  return rows[0]?.url ?? null;
}

export async function createShopProduct(input: {
  title: string;
  description: string;
  category: string;
  price_eur: number;
  image_url?: string | null;
  sizes?: string[];
  available?: boolean;
  personalization_enabled?: boolean;
  personalization_label?: string;
  personalization_max_length?: number;
  imageFile?: File | null;
  imageFiles?: File[] | null;
  coverImageIndex?: number;
  galleryOrder?: GalleryEntry[];
}): Promise<{ id: string }> {
  await requirePermission("manage_shop");
  const parsed = upsertShopProductSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  if (input.galleryOrder !== undefined) gallerySchema.parse(input.galleryOrder);
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
  if (files.length > 0 || input.galleryOrder !== undefined) {
    try {
      await replaceProductImages({
        productId: created.id,
        title: product.value!.title,
        files,
        coverIndex: input.coverImageIndex ?? 0,
        galleryOrder: input.galleryOrder,
      });
    } catch (error) {
      await admin.from("shop_products").delete().eq("id", created.id);
      throw error;
    }
  }
  revalidatePath("/shop");
  scheduleNotificationPush();
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
  personalization_enabled?: boolean;
  personalization_label?: string;
  personalization_max_length?: number;
  imageFile?: File | null;
  imageFiles?: File[] | null;
  coverImageIndex?: number;
  galleryOrder?: GalleryEntry[];
}): Promise<void> {
  await requirePermission("manage_shop");
  const parsed = updateShopProductSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  if (input.galleryOrder !== undefined) gallerySchema.parse(input.galleryOrder);
  const product = parseProduct(parsed.data);
  if (!product.ok) throw new Error(product.error ?? "Datos inválidos.");

  const admin = createAdminClient();
  let imageUrl = product.value!.image_url ?? null;
  const files = input.imageFiles?.length
    ? input.imageFiles
    : input.imageFile
      ? [input.imageFile]
      : [];
  if (files.length > 0 || input.galleryOrder !== undefined) {
    imageUrl = await replaceProductImages({
      productId: input.product_id,
      title: product.value!.title,
      files,
      coverIndex: input.coverImageIndex ?? 0,
      galleryOrder: input.galleryOrder,
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
  scheduleNotificationPush();
  revalidatePath("/admin/shop");
}

export async function deleteShopProduct(input: { product_id: string }): Promise<void> {
  await requirePermission("manage_shop");
  const parsed = deleteShopProductSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const admin = createAdminClient();
  const { count, error: orderItemsError } = await admin
    .from("shop_order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", parsed.data.product_id);
  if (orderItemsError) {
    throw new Error(
      "No pudimos comprobar si el producto tiene pedidos: " + orderItemsError.message,
    );
  }
  if ((count ?? 0) > 0) {
    throw new Error(
      "Este producto ya tiene pedidos. Ocúltalo del catálogo en lugar de eliminarlo.",
    );
  }
  const { error } = await admin.from("shop_products").delete().eq("id", input.product_id);
  if (error) throw new Error("No pudimos eliminar el producto: " + error.message);
  revalidatePath("/shop");
  scheduleNotificationPush();
  revalidatePath("/admin/shop");
}

export async function setShopProductAvailability(input: {
  product_id: string;
  available: boolean;
}): Promise<void> {
  await requirePermission("manage_shop");
  const parsed = deleteShopProductSchema.safeParse({ product_id: input.product_id });
  if (!parsed.success) throw new Error(toError(parsed.error));
  if (typeof input.available !== "boolean")
    throw new Error("Elige si el producto está publicado u oculto.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_products")
    .update({ available: input.available })
    .eq("id", parsed.data.product_id);
  if (error) throw new Error("No pudimos actualizar la visibilidad: " + error.message);
  revalidatePath("/shop");
  scheduleNotificationPush();
  revalidatePath("/admin/shop");
}

export async function updateShopOrderStatus(input: {
  order_id: string;
  status: ShopOrderStatus;
  admin_notes?: string | null;
}): Promise<void> {
  await requirePermission("manage_shop");
  const parsed = updateShopOrderStatusSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  if (!isValidShopOrderStatus(parsed.data.status)) {
    throw new Error("Estado de pedido inválido.");
  }

  const me = await requireSessionProfile();
  const admin = createAdminClient();
  const { data: currentOrder, error: currentOrderError } = await admin
    .from("shop_orders")
    .select("status")
    .eq("id", parsed.data.order_id)
    .maybeSingle();
  if (currentOrderError || !currentOrder) {
    throw new Error("No pudimos encontrar el pedido.");
  }
  if (!canManagerTransitionShopOrder(currentOrder.status, parsed.data.status)) {
    throw new Error(
      currentOrder.status === "pending_parent"
        ? "La familia debe aprobar este pedido antes de que la tienda pueda gestionarlo."
        : "Ese cambio de estado no está permitido.",
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    managed_by: me.id,
    updated_at: now,
  };
  if (parsed.data.admin_notes !== undefined) updates.admin_notes = parsed.data.admin_notes;
  if (parsed.data.status === "ordered") updates.ordered_at = now;
  if (parsed.data.status === "received") updates.received_at = now;
  if (parsed.data.status === "delivered") updates.delivered_at = now;
  if (currentOrder.status === "delivered" && parsed.data.status === "pending_admin")
    updates.delivered_at = null;
  if (parsed.data.status === "cancelled") updates.cancelled_at = now;

  const { data: updatedOrder, error } = await admin
    .from("shop_orders")
    .update(updates as never)
    .eq("id", parsed.data.order_id)
    .eq("status", currentOrder.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("No pudimos actualizar el pedido: " + error.message);
  if (!updatedOrder) {
    throw new Error("El pedido ha cambiado mientras lo gestionabas. Actualiza la página.");
  }
  scheduleNotificationPush();
  revalidatePath("/admin/shop");
  revalidatePath(`/shop/orders/${parsed.data.order_id}`);
  revalidatePath("/dashboard");
}

export async function createShopOrder(input: {
  checkout_key: string;
  expected_total_cents: number;
  items: Array<{
    product_id: string;
    size: string | null;
    personalization: string | null;
    quantity: number;
  }>;
  notes?: string | null;
  contact_phone?: string | null;
}): Promise<{ id: string; order_reference: string }> {
  const me = await requireSessionProfile();
  const parsed = createShopOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("submit_shop_checkout", {
    p_requester: me.id,
    p_checkout_key: parsed.data.checkout_key,
    p_items: parsed.data.items.map((item) => ({
      ...item,
      size: item.size ?? null,
      personalization: item.personalization ?? null,
    })),
    p_expected_total: parsed.data.expected_total_cents,
    p_notes: parsed.data.notes ?? null,
    p_contact_phone: normalizeSpanishPhone(parsed.data.contact_phone ?? ""),
  });
  if (error) throw new Error(error.message || "No pudimos guardar el pedido.");
  const result = z
    .object({ id: z.string().uuid(), order_reference: z.string(), created: z.boolean() })
    .parse(data);
  if (result.created) {
    try {
      const { data: order } = await admin
        .from("shop_orders")
        .select("status")
        .eq("id", result.id)
        .single();
      if (order?.status !== "pending_parent") await notifyShopOrder(result.id);
    } catch {
      console.error("El pedido está guardado, pero no se pudo completar su aviso.");
    }
  }
  revalidatePath("/shop");
  revalidatePath("/shop/orders");
  revalidatePath("/shop/parents/pending");
  scheduleNotificationPush();
  revalidatePath("/admin/shop");
  revalidatePath("/shop/orders/" + result.id);
  revalidatePath("/dashboard");
  return { id: result.id, order_reference: result.order_reference };
}

export async function decideShopOrder(input: {
  order_id: string;
  decision: "approve" | "reject";
  contact_phone?: string | null;
  parent_notes?: string | null;
}): Promise<void> {
  const me = await requireSessionProfile();
  const parsed = decideShopOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("shop_orders")
    .select("requested_by, status, order_reference")
    .eq("id", parsed.data.order_id)
    .maybeSingle();
  if (!order || order.status !== "pending_parent") {
    throw new Error("El pedido no existe o ya no está pendiente.");
  }

  const [{ data: parentLink }, { data: parentProfile }] = await Promise.all([
    supabase
      .from("parent_child_links")
      .select("parent_profile_id")
      .eq("parent_profile_id", me.id)
      .eq("child_profile_id", order.requested_by)
      .maybeSingle(),
    supabase.from("profiles").select("birth_year").eq("id", me.id).maybeSingle(),
  ]);
  if (!parentLink || !parentProfile || requiresGuardianApproval(parentProfile.birth_year)) {
    throw new Error("Solo su familia puede decidir este pedido.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  let approverPhone: string | null = null;

  if (parsed.data.decision === "approve") {
    const { data: approver, error: approverError } = await admin
      .from("profiles")
      .select("phone_e164")
      .eq("id", me.id)
      .maybeSingle();
    if (approverError || !approver) {
      throw new Error("No pudimos comprobar tu teléfono de contacto.");
    }

    approverPhone = resolveShopContactPhone({
      storedPhone: approver.phone_e164,
      submittedPhone: normalizeSpanishPhone(parsed.data.contact_phone ?? ""),
      deferToGuardian: false,
    });
    if (!approverPhone) {
      throw new Error("Añade un teléfono de contacto válido antes de aprobar el pedido.");
    }
    if (!approver.phone_e164) {
      const { error: phoneError } = await admin
        .from("profiles")
        .update({ phone_e164: approverPhone })
        .eq("id", me.id);
      if (phoneError) throw new Error("No pudimos guardar tu teléfono de contacto.");
    }
  }

  const updates: Record<string, unknown> = {
    status: parsed.data.decision === "approve" ? "pending_admin" : "rejected",
    approved_by: me.id,
    approved_at: now,
    parent_notes: parsed.data.parent_notes ?? null,
    updated_at: now,
  };
  if (approverPhone) updates.contact_phone_e164 = approverPhone;
  if (parsed.data.decision === "reject") updates.cancelled_at = now;

  const { data: updatedOrder, error } = await admin
    .from("shop_orders")
    .update(updates as never)
    .eq("id", parsed.data.order_id)
    .eq("status", "pending_parent")
    .select("id")
    .maybeSingle();
  if (error) throw new Error("No pudimos actualizar el pedido: " + error.message);
  if (!updatedOrder) throw new Error("Este pedido ya lo ha decidido otra persona de la familia.");

  if (parsed.data.decision === "approve") {
    try {
      await notifyShopOrder(parsed.data.order_id);
    } catch {
      console.error("El pedido está aprobado, pero no se pudo completar su aviso.");
    }
  }

  revalidatePath(`/shop/orders/${parsed.data.order_id}`);
  revalidatePath("/shop/parents/pending");
  revalidatePath("/shop/orders");
  revalidatePath("/profile");
  scheduleNotificationPush();
  revalidatePath("/admin/shop");
}


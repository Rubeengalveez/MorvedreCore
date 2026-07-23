"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { insertNotificationsWithPush } from "./notification-dispatch";
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
  summarizeCart,
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
  max_per_order?: number;
  personalization_enabled?: boolean;
  personalization_label?: string;
  personalization_max_length?: number;
  imageFile?: File | null;
  imageFiles?: File[] | null;
  coverImageIndex?: number;
}): Promise<{ id: string }> {
  await requirePermission("manage_shop");
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
  max_per_order?: number;
  personalization_enabled?: boolean;
  personalization_label?: string;
  personalization_max_length?: number;
  imageFile?: File | null;
  imageFiles?: File[] | null;
  coverImageIndex?: number;
}): Promise<void> {
  await requirePermission("manage_shop");
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
  await requirePermission("manage_shop");
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
    admin_notes: parsed.data.admin_notes ?? null,
    managed_by: me.id,
    updated_at: now,
  };
  if (parsed.data.status === "ordered") updates.ordered_at = now;
  if (parsed.data.status === "received") updates.received_at = now;
  if (parsed.data.status === "delivered") updates.delivered_at = now;
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
  contact_phone?: string | null;
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
  const { data: requester, error: requesterError } = await admin
    .from("profiles")
    .select("phone_e164, birth_year")
    .eq("id", me.id)
    .maybeSingle();
  if (requesterError || !requester) {
    throw new Error("No pudimos comprobar tus datos de contacto.");
  }
  const needsGuardian = requiresGuardianApproval(requester.birth_year);
  const contactPhone = resolveShopContactPhone({
    storedPhone: requester.phone_e164,
    submittedPhone: normalizeSpanishPhone(parsed.data.contact_phone ?? ""),
    deferToGuardian: needsGuardian,
  });
  if (!needsGuardian) {
    if (!contactPhone) {
      throw new Error("Añade un teléfono de contacto válido para enviar el pedido.");
    }
    if (!requester.phone_e164) {
      const { error: phoneError } = await admin
        .from("profiles")
        .update({ phone_e164: contactPhone })
        .eq("id", me.id);
      if (phoneError) throw new Error("No pudimos guardar tu teléfono de contacto.");
    }
  }
  if (needsGuardian) {
    const { count: guardianCount } = await admin
      .from("parent_child_links")
      .select("parent_profile_id", { count: "exact", head: true })
      .eq("child_profile_id", me.id);
    if ((guardianCount ?? 0) === 0) {
      throw new Error(
        "Necesitas tener un tutor vinculado antes de enviar un pedido. Pide ayuda a un administrador.",
      );
    }
  }
  const { data: order, error: oErr } = await admin
    .from("shop_orders")
    .insert({
      requested_by: me.id,
      status: needsGuardian ? "pending_parent" : "pending_admin",
      guardian_approval_required: needsGuardian,
      total_cents: cart.total_cents!,
      currency: "EUR",
      notes: parsed.data.notes ?? null,
      contact_phone_e164: contactPhone,
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

  if (needsGuardian) {
    await notifyParentsOfOrder(order.id, me.id, products);
  } else {
    await notifyShopManagerOfOrder(order.id, me.id, contactPhone!, cart.lines!, products);
  }

  revalidatePath("/shop");
  revalidatePath("/shop/orders");
  revalidatePath(`/shop/orders/${order.id}`);
  revalidatePath("/dashboard");
  return { id: order.id };
}

async function notifyShopManagerOfOrder(
  orderId: string,
  requesterId: string,
  contactPhone: string,
  lines: Array<{
    product_id: string;
    size: string | null;
    personalization: string | null;
    quantity: number;
  }>,
  products: Array<{ id: string; title: string }>,
): Promise<void> {
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
      return `- ${line.quantity} × ${productById.get(line.product_id) ?? "Producto"}${options.length > 0 ? ` (${options.join(", ")})` : ""}`;
    })
    .join("\n");

  const { data: managerPermissions } = await admin
    .from("profile_permissions")
    .select("profile_id")
    .eq("permission", "manage_shop");
  const managerIds = Array.from(new Set((managerPermissions ?? []).map((row) => row.profile_id)));
  const { data: managers } = managerIds.length
    ? await admin.from("profiles").select("email_contact").in("id", managerIds)
    : { data: [] as Array<{ email_contact: string | null }> };
  const recipients = Array.from(
    new Set(
      [
        ...(managers ?? []).map((manager) => manager.email_contact).filter(Boolean),
        process.env.SHOP_MANAGER_EMAIL,
        process.env.ADMIN_EMAIL,
        "galvillo9@gmail.com",
      ].filter((email): email is string => Boolean(email)),
    ),
  );

  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: `Nueva solicitud de tienda · ${requester?.full_name ?? "Socio/a"}`,
        text: `Nueva solicitud de material en Morvedre Core.

Solicitante: ${requester?.full_name ?? requesterId}
Teléfono: ${contactPhone}
Pedido: ${orderId}

${detail}

Puedes gestionarlo desde /admin/shop.
`,
      }),
    ),
  );
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
    .select("requested_by, status")
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
    const { data: itemRows } = await admin
      .from("shop_order_items")
      .select("product_id, size, personalization, quantity")
      .eq("order_id", parsed.data.order_id);
    const productIds = Array.from(new Set((itemRows ?? []).map((item) => item.product_id)));
    const { data: productRows } = productIds.length
      ? await admin.from("shop_products").select("id, title").in("id", productIds)
      : { data: [] as Array<{ id: string; title: string }> };
    await notifyShopManagerOfOrder(
      parsed.data.order_id,
      order.requested_by,
      approverPhone!,
      (itemRows ?? []).map((item) => ({
        product_id: item.product_id,
        size: item.size,
        personalization: item.personalization,
        quantity: item.quantity,
      })),
      productRows ?? [],
    );
  }

  revalidatePath(`/shop/orders/${parsed.data.order_id}`);
  revalidatePath("/shop/parents/pending");
  revalidatePath("/profile");
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

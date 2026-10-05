import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { shopOrderEmail } from "@/lib/email/shop-order";
import { createShopOrdersPdf } from "@/lib/domain/shop-orders-pdf";
import { ACTIVE_SHOP_STATUSES } from "@/lib/domain/shop-management";
import { loadShopManagementOrders } from "@/server/queries/admin-shop";
import type { Json } from "@/types/database";

const payloadSchema = z.object({
  subject: z.string(),
  text: z.string(),
  html: z.string().optional(),
  attachments: z.array(z.object({ filename: z.string(), content: z.string() })).optional(),
});
type Payload = z.infer<typeof payloadSchema>;

async function shopRecipients(): Promise<string[]> {
  const configured = process.env.SHOP_MANAGER_EMAIL;
  if (configured) return [z.email().parse(configured)];
  const admin = createAdminClient();
  const { data: permissions, error } = await admin
    .from("profile_permissions")
    .select("profile_id")
    .eq("permission", "manage_shop");
  if (error) throw new Error("No pudimos cargar los destinatarios de tienda.");
  const ids = (permissions ?? []).map((row) => row.profile_id);
  if (!ids.length) throw new Error("Configura el correo de la tienda.");
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("email_contact")
    .in("id", ids);
  if (profileError) throw new Error("No pudimos cargar los correos de tienda.");
  const recipients = [
    ...new Set(
      (profiles ?? [])
        .map((profile) => profile.email_contact)
        .filter((email): email is string => Boolean(email) && z.email().safeParse(email).success),
    ),
  ];
  if (!recipients.length) throw new Error("Configura el correo de la tienda.");
  return recipients;
}

async function deliver(key: string, to: string, makePayload: () => Payload): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error: insertError } = await admin
    .from("shop_email_deliveries")
    .insert({
      event_key: key,
      recipient: to,
      status: "processing",
      payload: makePayload() as unknown as Json,
      claimed_at: now,
    });
  if (insertError && insertError.code !== "23505")
    throw new Error("No pudimos preparar el correo de tienda.");
  const { data: existing, error } = await admin
    .from("shop_email_deliveries")
    .select("*")
    .eq("event_key", key)
    .eq("recipient", to)
    .single();
  if (error || !existing) throw new Error("No pudimos recuperar el correo pendiente.");
  if (existing.status === "sent") return true;
  if (insertError) {
    if (
      existing.status === "processing" &&
      new Date(existing.claimed_at).getTime() > Date.now() - 10 * 60 * 1000
    )
      return false;
    const { data: claimed, error: claimError } = await admin
      .from("shop_email_deliveries")
      .update({ status: "processing", claimed_at: now })
      .eq("event_key", key)
      .eq("recipient", to)
      .eq("claimed_at", existing.claimed_at)
      .neq("status", "sent")
      .select("event_key")
      .maybeSingle();
    if (claimError || !claimed) return false;
  }
  const payload = payloadSchema.parse(existing.payload);
  const result = await sendEmail({
    to,
    ...payload,
    idempotencyKey: createHash("sha256").update(`${key}:${to}`).digest("hex"),
  });
  const { error: updateError } = await admin
    .from("shop_email_deliveries")
    .update({
      status: result.success ? "sent" : "failed",
      sent_at: result.success ? new Date().toISOString() : null,
      ...(result.success ? { payload: null } : {}),
    })
    .eq("event_key", key)
    .eq("recipient", to)
    .eq("claimed_at", now);
  if (updateError) throw new Error("No pudimos registrar el resultado del correo.");
  return result.success;
}

export async function notifyShopOrder(orderId: string): Promise<void> {
  try {
    const orders = await loadShopManagementOrders([...ACTIVE_SHOP_STATUSES], orderId);
    const order = orders[0];
    if (!order) return;
    const url =
      process.env.SHOP_MANAGEMENT_URL ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/shop`;
    const recipients = await shopRecipients();
    const results = await Promise.all(
      recipients.map((to) =>
        deliver(`shop-order:${order.id}`, to, () => shopOrderEmail(order, url)),
      ),
    );
    if (results.some((sent) => !sent))
      console.warn("[shop-email] El pedido está guardado; el correo queda pendiente de reintento.");
  } catch (error) {
    console.error(
      "[shop-email] No pudimos notificar el pedido guardado:",
      error instanceof Error ? error.message : "Error desconocido",
    );
  }
}

export function shopReminderMonth(now: Date): string | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return value("day") === "01" ? `${value("year")}-${value("month")}` : null;
}

export async function sendMonthlyShopReminder(
  now = new Date(),
): Promise<{ sent: boolean; orders: number }> {
  const month = shopReminderMonth(now);
  if (!month) return { sent: false, orders: 0 };
  const orders = await loadShopManagementOrders([...ACTIVE_SHOP_STATUSES]);
  if (!orders.length) return { sent: false, orders: 0 };
  const recipients = await shopRecipients();
  const results = await Promise.all(
    recipients.map((to) =>
      deliver(`shop-month:${month}`, to, () => ({
        subject: `Pedidos pendientes · ${month} · Morvedre`,
        text: `Tienes ${orders.length} pedidos pendientes de entrega. Encontrarás todos los detalles en el PDF adjunto. Los pedidos entregados no están incluidos.`,
        attachments: [
          {
            filename: `pedidos-pendientes-${month}.pdf`,
            content: Buffer.from(createShopOrdersPdf(orders, now)).toString("base64"),
          },
        ],
      })),
    ),
  );
  return { sent: results.every(Boolean), orders: orders.length };
}

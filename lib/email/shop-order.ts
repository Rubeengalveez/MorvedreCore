import { escapeHtml } from "./html";
import { shopMoney, type ManagedShopOrder } from "@/lib/domain/shop-management";

export function shopOrderEmail(order: ManagedShopOrder, managementUrl: string) {
  const name = order.requested_by_name ?? "Nombre no disponible";
  const date = new Date(order.requested_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
  const contact = [
    order.category_label ? `Categoría: ${order.category_label}` : null,
    `Pedido: ${order.order_reference}`,
    `Fecha: ${date}`,
    `Teléfono: ${order.contact_phone_e164 ?? order.guardian_phone ?? "Sin teléfono"}`,
    order.requester_email ? `Correo: ${order.requester_email}` : null,
    order.approved_by_name ? `Familia: ${order.approved_by_name}` : null,
    order.guardian_email ? `Correo de la familia: ${order.guardian_email}` : null,
  ].filter((value): value is string => Boolean(value));
  const notes = [order.notes, order.parent_notes].filter((value): value is string =>
    Boolean(value),
  );
  const lines = order.items.map(
    (item) =>
      `${item.quantity} x ${item.product_title ?? "Producto"}${item.size ? ` · Talla ${item.size}` : ""}${item.personalization ? ` · Nombre: ${item.personalization}` : ""} · ${shopMoney(item.subtotal_cents)}`,
  );
  const text = `Nuevo pedido de ${name}\n\n${contact.join("\n")}\n\n${lines.join("\n")}\n\nTotal: ${shopMoney(order.total_cents)}${notes.length ? `\n\nNotas:\n${notes.join("\n")}` : ""}\n\nGestionar pedidos: ${managementUrl}`;
  const html = `<html lang="es"><body style="margin:0;background:#e3edf5;font-family:Arial,sans-serif;color:#0a2e5c"><div style="max-width:560px;margin:24px auto;border:2px solid #0a2e5c;border-radius:16px;overflow:hidden;background:#fff"><div style="background:#0a2e5c;color:#fff;padding:24px"><p style="margin:0 0 8px;font-size:14px">TIENDA MORVEDRE</p><h1 style="margin:0;font-size:24px">Nuevo pedido</h1></div><div style="padding:24px"><h2 style="margin:0 0 16px;font-size:22px">${escapeHtml(name)}</h2>${contact.map((line) => `<p style="margin:8px 0;font-size:16px;line-height:1.5">${escapeHtml(line)}</p>`).join("")}<h3 style="font-size:18px;margin:24px 0 12px">Qué hay que preparar</h3>${lines.map((line) => `<div style="margin:10px 0;padding:14px;border:1px solid #0a2e5c;border-radius:10px;background:#f5f8fc;font-size:16px;line-height:1.5">${escapeHtml(line)}</div>`).join("")}<p style="font-size:20px;font-weight:bold">Total: ${escapeHtml(shopMoney(order.total_cents))}</p>${notes.map((note) => `<p style="padding:14px;border:1px solid #0a2e5c;border-radius:10px;background:#fff5d6;font-size:16px;line-height:1.5">${escapeHtml(note).replace(/\n/g, "<br>")}</p>`).join("")}<a href="${escapeHtml(managementUrl)}" style="display:block;padding:18px;background:#0a2e5c;color:#fff;border-radius:12px;text-align:center;font-size:17px;font-weight:bold;text-decoration:none">Ver pedidos pendientes</a></div></div></body></html>`;
  return { subject: `Pedido ${order.order_reference} · ${name}`, text, html };
}

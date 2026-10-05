import { jsPDF } from "jspdf";
import { isActiveShopOrder, shopMoney, type ManagedShopOrder } from "./shop-management";

export function createShopOrdersPdf(
  input: ManagedShopOrder[],
  generatedAt = new Date(),
): Uint8Array {
  const orders = input.filter(isActiveShopOrder);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({
    title: "Pedidos pendientes - Morvedre",
    author: "Club Waterpolo Morvedre",
    subject: "Material pendiente de entrega",
  });
  doc.setCreationDate(generatedAt);
  const left = 14,
    width = 182,
    bottom = 279;
  let y = 0;
  const money = (cents: number) => shopMoney(cents).replace(/\u00a0/g, " ");
  function font(size = 11, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(10, 46, 92);
  }
  function lines(text: string, available: number, size = 11, bold = false): string[] {
    font(size, bold);
    return doc.splitTextToSize(text, available) as string[];
  }
  function surface(x: number, top: number, w: number, h: number, fill: [number, number, number]) {
    doc.setFillColor(...fill);
    doc.setDrawColor(10, 46, 92);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, top, w, h, 2, 2, "FD");
  }
  function header() {
    doc.setFillColor(10, 46, 92);
    doc.rect(0, 0, 210, 31, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(244, 196, 48);
    doc.text("MORVEDRE · TIENDA DEL CLUB", left, 9);
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Pedidos pendientes", left, 21);
    font(10);
    doc.text(generatedAt.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }), 196, 38, {
      align: "right",
    });
    font(11, true);
    doc.text(
      `${orders.length} pedidos · ${orders.reduce((sum, order) => sum + order.items.reduce((units, item) => units + item.quantity, 0), 0)} unidades`,
      left,
      38,
    );
    y = 45;
  }
  header();
  if (!orders.length) {
    surface(left, y, width, 25, [235, 245, 250]);
    font(14, true);
    doc.text("No hay pedidos pendientes de entrega.", left + 6, y + 15);
  }
  for (const order of orders) {
    type Block = { height: number; draw: (top: number) => void };
    const blocks: Block[] = [];
    const contacts = [
      order.approved_by_name ? `Familia: ${order.approved_by_name}` : null,
      `Teléfono: ${order.contact_phone_e164 ?? order.guardian_phone ?? "Sin teléfono"}`,
      (order.guardian_email ?? order.requester_email)
        ? `Correo: ${order.guardian_email ?? order.requester_email}`
        : null,
    ].filter((value): value is string => Boolean(value));
    const contactLines = contacts.flatMap((text) => lines(text, width - 18, 10));
    blocks.push({
      height: contactLines.length * 4.5 + 5,
      draw: (top) => {
        font(10);
        doc.text(contactLines, left + 9, top + 5, { lineHeightFactor: 1.28 });
      },
    });
    for (const item of order.items) {
      const title = lines(item.product_title ?? "Producto", 118, 11, true);
      const detail = [
        item.size ? `Talla: ${item.size}` : null,
        item.personalization ? `Nombre: ${item.personalization}` : null,
        item.quantity > 1 ? `${money(item.unit_price_cents)} / unidad` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .flatMap((text) => lines(text, 118, 10));
      const h = Math.max(16, (title.length + detail.length) * 4.5 + 8);
      blocks.push({
        height: h + 3,
        draw: (top) => {
          surface(left + 5, top, width - 10, h, [245, 248, 251]);
          surface(left + 8, top + 3, 13, 10, [225, 237, 246]);
          font(11, true);
          doc.text(`${item.quantity}×`, left + 14.5, top + 9.5, { align: "center" });
          font(11, true);
          doc.text(title, left + 25, top + 6, { lineHeightFactor: 1.16 });
          font(10);
          if (detail.length)
            doc.text(detail, left + 25, top + 6 + title.length * 4.5, { lineHeightFactor: 1.28 });
          font(11, true);
          doc.text(money(item.subtotal_cents), left + width - 9, top + 7, { align: "right" });
        },
      });
    }
    for (const [label, note] of [
      ["Nota", order.notes],
      ["Nota de la familia", order.parent_notes],
      ["Nota de tienda", order.admin_notes],
    ]) {
      if (!note) continue;
      const all = lines(`${label}: ${note}`, width - 20, 10);
      for (let offset = 0; offset < all.length; offset += 12) {
        const part = all.slice(offset, offset + 12),
          h = part.length * 4.5 + 7;
        blocks.push({
          height: h + 3,
          draw: (top) => {
            surface(left + 5, top, width - 10, h, [255, 247, 220]);
            font(10);
            doc.text(part, left + 10, top + 5, { lineHeightFactor: 1.28 });
          },
        });
      }
    }
    blocks.push({
      height: 17,
      draw: (top) => {
        surface(left + 5, top, width - 10, 13, [225, 237, 246]);
        font(11, true);
        doc.text("TOTAL DEL PEDIDO", left + 10, top + 8);
        font(14, true);
        doc.text(money(order.total_cents), left + width - 10, top + 8.5, { align: "right" });
      },
    });
    const name = lines(order.requested_by_name ?? "Nombre no disponible", width - 14, 14, true);
    const titleHeight = 17 + name.length * 5.4;
    const wholeHeight = titleHeight + blocks.reduce((sum, block) => sum + block.height, 0) + 5;
    if (wholeHeight <= bottom - 45 && y + wholeHeight > bottom) {
      doc.addPage();
      header();
    }
    let index = 0,
      continuation = false;
    while (index < blocks.length) {
      const minHeight = titleHeight + blocks[index].height + 5;
      if (y + minHeight > bottom) {
        doc.addPage();
        header();
      }
      let end = index,
        contentHeight = 0;
      while (
        end < blocks.length &&
        y + titleHeight + contentHeight + blocks[end].height + 5 <= bottom
      )
        contentHeight += blocks[end++].height;
      if (end === index)
        throw new Error("No pudimos maquetar un pedido. Revisa la longitud de sus datos.");
      surface(left, y, width, titleHeight + contentHeight + 5, [255, 255, 255]);
      doc.setFillColor(225, 237, 246);
      doc.roundedRect(left + 0.4, y + 0.4, width - 0.8, titleHeight - 1, 1.7, 1.7, "F");
      font(10, true);
      doc.text(
        `PEDIDO ${order.order_reference}${continuation ? " · CONTINUACIÓN" : ""}`,
        left + 6,
        y + 6,
      );
      font(10);
      doc.text(
        new Date(order.requested_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }),
        left + width - 6,
        y + 6,
        { align: "right" },
      );
      font(14, true);
      doc.text(name, left + 6, y + 13, { lineHeightFactor: 1.1 });
      font(10, true);
      doc.text(
        order.category_label ? `Categoría: ${order.category_label}` : "Familia / socio",
        left + 6,
        y + titleHeight - 4,
      );
      let row = y + titleHeight;
      for (; index < end; index++) {
        blocks[index].draw(row);
        row += blocks[index].height;
      }
      y = row + 9;
      continuation = true;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    font(9);
    doc.text("Solo pedidos pendientes de entrega", left, 290);
    doc.text(`${page} / ${pages}`, 196, 290, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

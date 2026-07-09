import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { getShopOrdersForKanban } from "@/server/queries/shop";
import type { ShopOrderStatus } from "@/lib/domain/shop";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  return !!data;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const statuses: ShopOrderStatus[] = ["pending_admin", "ordered", "received", "delivered"];
  const orders = await getShopOrdersForKanban(statuses);
  const grouped = new Map<
    string,
    {
      producto: string;
      talla: string;
      categoria: string;
      cantidad: number;
      importe: number;
      pedidos: Set<string>;
      compradores: Set<string>;
      estados: Set<string>;
    }
  >();
  const detailRows: Array<Record<string, string | number>> = [];

  for (const order of orders) {
    for (const item of order.items) {
      const product = item.product_title ?? "Producto";
      const size = item.size ?? "Sin talla";
      const key = `${item.product_id}:${size}`;
      const current =
        grouped.get(key) ??
        {
          producto: product,
          talla: size,
          categoria: item.product_category ?? "",
          cantidad: 0,
          importe: 0,
          pedidos: new Set<string>(),
          compradores: new Set<string>(),
          estados: new Set<string>(),
        };
      current.cantidad += item.quantity;
      current.importe += item.subtotal_cents / 100;
      current.pedidos.add(order.id);
      current.compradores.add(order.requested_by_name ?? order.requested_by);
      current.estados.add(order.status);
      grouped.set(key, current);

      detailRows.push({
        Pedido: order.id,
        Estado: order.status,
        Solicitante: order.requested_by_name ?? order.requested_by,
        Producto: product,
        Talla: size,
        Cantidad: item.quantity,
        "Precio unitario": item.unit_price_cents / 100,
        Subtotal: item.subtotal_cents / 100,
      });
    }
  }

  const summaryRows = Array.from(grouped.values()).map((row) => ({
    Producto: row.producto,
    Talla: row.talla,
    Categoria: row.categoria,
    Cantidad: row.cantidad,
    Importe: row.importe,
    Pedidos: row.pedidos.size,
    Compradores: Array.from(row.compradores).join(", "),
    Estados: Array.from(row.estados).join(", "),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Agrupado");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), "Detalle");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pedidos_tienda_agrupados.xlsx"',
    },
  });
}

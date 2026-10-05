import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/server/actions/admin/_helpers";
import { getShopManagementOrders } from "@/server/queries/admin-shop";
import { selectPdfOrders } from "@/lib/domain/shop-management";
import { createShopOrdersPdf } from "@/lib/domain/shop-orders-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const selectionSchema = z.object({ ids: z.array(z.uuid()).min(1).max(5000).optional() }).strict();

export async function POST(request: Request) {
  try {
    await requirePermission("manage_shop");
  } catch {
    return NextResponse.json({ error: "Inicia sesión con permisos de tienda." }, { status: 403 });
  }
  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Selecciona al menos un pedido válido." }, { status: 400 });
  try {
    const orders = selectPdfOrders(await getShopManagementOrders(), parsed.data.ids);
    if (!orders.length)
      return NextResponse.json(
        { error: "No hay pedidos pendientes para descargar." },
        { status: 409 },
      );
    const pdf = createShopOrdersPdf(orders);
    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="pedidos-pendientes-morvedre.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos preparar el PDF." },
      { status: 409 },
    );
  }
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrder } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CapTile } from "@/components/ui/cap-tile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Pedido ${id.slice(0, 8)} — Morvedre Core` };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const order = await getShopOrder(id);
  if (!order) notFound();

  const date = new Date(order.requested_at);
  const statusColor = (() => {
    switch (order.status) {
      case "pending_parent":
        return "var(--warning)";
      case "pending_admin":
        return "var(--pool-blue)";
      case "rejected":
      case "cancelled":
        return "var(--goggle-red)";
      case "ordered":
        return "var(--pool-teal)";
      case "received":
        return "var(--pool-blue)";
      case "delivered":
        return "var(--success)";
      default:
        return "var(--ink-500)";
    }
  })();

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/shop/orders" as Route}
          className="text-pool-blue inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Mis pedidos
        </Link>

        <div className="border-ink-300 bg-paper-card shadow-elev-1 rounded-md border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Eyebrow>Pedido {order.id.slice(0, 8)}</Eyebrow>
              <h1 className="font-display text-pool-deep text-xl font-extrabold">
                {date.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h1>
            </div>
            <span
              className="inline-flex h-7 items-center rounded-full px-3 text-[10px] font-extrabold tracking-wider uppercase"
              style={{ backgroundColor: statusColor + "20", color: statusColor }}
            >
              {SHOP_ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="text-pool-deep mt-3 font-mono text-3xl font-extrabold">
            {formatCents(order.total_cents, order.currency)}
          </p>
          <p className="text-ink-600 text-[11px]">
            {order.items.length} producto{order.items.length === 1 ? "" : "s"}
          </p>
          {order.notes ? (
            <p className="bg-paper-sunk/40 text-ink-700 mt-3 rounded-md p-2 text-xs italic">
              {order.notes}
            </p>
          ) : null}
        </div>

        <section aria-labelledby="items-heading" className="flex flex-col gap-2">
          <h2 id="items-heading" className="text-eyebrow text-ink-600">
            Productos
          </h2>
          <ul className="flex flex-col gap-1.5">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="border-ink-300 bg-paper-card flex items-center gap-3 rounded-md border p-2.5"
              >
                {item.product_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product_image_url}
                    alt={item.product_title ?? ""}
                    className="h-12 w-12 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="bg-pool-foam flex h-12 w-12 shrink-0 items-center justify-center rounded">
                    <CapTile number={1} teamColor="var(--pool-deep)" size="sm" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep line-clamp-1 text-sm font-bold">
                    {item.product_title ?? "Producto"}
                  </p>
                  <p className="text-ink-600 text-[10px]">
                    {item.size ? `Talla ${item.size} · ` : ""}
                    {item.quantity} × {formatCents(item.unit_price_cents, order.currency)}
                  </p>
                </div>
                <p className="text-pool-deep font-mono text-sm font-extrabold">
                  {formatCents(item.subtotal_cents, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {order.parent_notes ? (
          <section className="border-pool-blue/30 bg-pool-blue/5 rounded-md border p-3">
            <Eyebrow>Nota del padre</Eyebrow>
            <p className="text-pool-deep mt-1 text-sm">{order.parent_notes}</p>
          </section>
        ) : null}

        {order.admin_notes ? (
          <section className="border-pool-teal/30 bg-pool-teal/5 rounded-md border p-3">
            <Eyebrow>Nota del admin</Eyebrow>
            <p className="text-pool-deep mt-1 text-sm">{order.admin_notes}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

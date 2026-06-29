import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Package } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrder } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CapTile } from "@/components/ui/cap-tile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Pedido ${id.slice(0, 8)} — Morvedre Core` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          className="inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Mis pedidos
        </Link>

        <div className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Eyebrow>Pedido {order.id.slice(0, 8)}</Eyebrow>
              <h1 className="font-display text-xl font-extrabold text-pool-deep">
                {date.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h1>
            </div>
            <span
              className="inline-flex h-7 items-center rounded-full px-3 text-[10px] font-extrabold uppercase tracking-wider"
              style={{ backgroundColor: statusColor + "20", color: statusColor }}
            >
              {SHOP_ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-pool-deep">
            {formatCents(order.total_cents, order.currency)}
          </p>
          <p className="text-[11px] text-ink-600">
            {order.items.length} producto{order.items.length === 1 ? "" : "s"}
          </p>
          {order.notes ? (
            <p className="mt-3 rounded-md bg-paper-sunk/40 p-2 text-xs italic text-ink-700">
              {order.notes}
            </p>
          ) : null}
        </div>

        <section
          aria-labelledby="items-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="items-heading" className="text-eyebrow text-ink-600">
            Productos
          </h2>
          <ul className="flex flex-col gap-1.5">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper-card p-2.5"
              >
                {item.product_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product_image_url}
                    alt={item.product_title ?? ""}
                    className="h-12 w-12 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-pool-foam">
                    <CapTile number={1} teamColor="var(--pool-deep)" size="sm" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-pool-deep">
                    {item.product_title ?? "Producto"}
                  </p>
                  <p className="text-[10px] text-ink-600">
                    {item.size ? `Talla ${item.size} · ` : ""}
                    {item.quantity} × {formatCents(item.unit_price_cents, order.currency)}
                  </p>
                </div>
                <p className="font-mono text-sm font-extrabold text-pool-deep">
                  {formatCents(item.subtotal_cents, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {order.parent_notes ? (
          <section className="rounded-md border border-pool-blue/30 bg-pool-blue/5 p-3">
            <Eyebrow>Nota del padre</Eyebrow>
            <p className="mt-1 text-sm text-pool-deep">{order.parent_notes}</p>
          </section>
        ) : null}

        {order.admin_notes ? (
          <section className="rounded-md border border-pool-teal/30 bg-pool-teal/5 p-3">
            <Eyebrow>Nota del admin</Eyebrow>
            <p className="mt-1 text-sm text-pool-deep">{order.admin_notes}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

void Package;

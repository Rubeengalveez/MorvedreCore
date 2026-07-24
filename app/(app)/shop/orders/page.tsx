import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, PackageOpen, ReceiptText } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForPlayer } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Mis pedidos — Morvedre Core" };

export default async function MyOrdersPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const orders = await getShopOrdersForPlayer(ctx.activeProfile.id);

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink href={"/shop" as Route}>Volver a la tienda</PageBackLink>
      <PageHeader
        eyebrow="Seguimiento"
        title="Mis pedidos"
        description="Consulta qué has pedido y en qué punto está."
        icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
      />

      {orders.length === 0 ? (
        <div className="border-ink-200 bg-paper-card flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed px-6 text-center">
          <PackageOpen className="text-ink-400 h-9 w-9" aria-hidden="true" />
          <h2 className="font-display text-pool-deep mt-4 text-xl font-extrabold">
            Todavía no hay pedidos
          </h2>
          <p className="text-ink-500 mt-2 text-base">Tus solicitudes aparecerán aquí.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/shop/orders/${order.id}` as Route}
                className="border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/35 hover:shadow-elev-2 focus-visible:ring-pool-blue group relative block min-h-28 touch-manipulation overflow-hidden rounded-2xl border px-4 py-3.5 pl-5 transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.995] motion-reduce:transition-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-3 left-0 w-1 rounded-r-full",
                    order.status === "delivered"
                      ? "bg-success"
                      : order.status === "rejected" || order.status === "cancelled"
                        ? "bg-goggle-red"
                        : "bg-pool-blue",
                  )}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-pool-blue text-sm font-extrabold tracking-[0.04em] uppercase">
                      Pedido {order.order_reference}
                    </p>
                    <p className="text-ink-500 mt-0.5 text-sm font-semibold">
                      {new Intl.DateTimeFormat("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(order.requested_at))}
                    </p>
                  </div>
                  <ChevronRight
                    className="text-ink-400 group-hover:text-pool-blue mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </div>
                <div className="border-ink-200 mt-3 flex items-end justify-between gap-3 border-t pt-3">
                  <div className="min-w-0">
                    <StatusBadge status={order.status} />
                    <p className="text-ink-500 mt-1.5 text-sm font-semibold">
                      {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                  <p className="text-pool-deep shrink-0 font-mono text-xl font-extrabold tabular-nums">
                    {formatCents(order.total_cents, order.currency)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function StatusBadge({ status }: { status: keyof typeof SHOP_ORDER_STATUS_LABELS }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-extrabold tracking-wide uppercase",
        status === "delivered" && "bg-success/10 text-success",
        status === "rejected" || status === "cancelled"
          ? "bg-goggle-red/10 text-goggle-red"
          : status !== "delivered"
            ? "bg-pool-foam text-pool-blue"
            : "",
      )}
    >
      {SHOP_ORDER_STATUS_LABELS[status]}
    </span>
  );
}

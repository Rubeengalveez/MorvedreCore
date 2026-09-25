import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronRight, PackageOpen, ReceiptText } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForPlayer } from "@/server/queries/shop";
import { formatCents } from "@/lib/domain/shop";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Mis pedidos — Morvedre Core" };

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function MyOrdersPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const orders = await getShopOrdersForPlayer(ctx.activeProfile.id);

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink href={"/shop" as Route}>Volver a la tienda</PageBackLink>
      <PageHeader
        eyebrow="Tienda Morvedre"
        title="Mis pedidos"
        description="Tus compras enviadas al club, agrupadas por pedido."
        icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
      />

      {orders.length === 0 ? (
        <div className="border-ink-200 bg-paper-card flex min-h-64 flex-col items-center justify-center rounded-2xl border px-6 text-center">
          <span className="bg-pool-foam text-pool-deep flex h-14 w-14 items-center justify-center rounded-2xl">
            <PackageOpen className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="font-display text-pool-deep mt-4 text-xl font-extrabold">
            Aún no tienes pedidos
          </h2>
          <p className="text-ink-600 mt-2 text-base leading-relaxed">
            Cuando envíes una compra al club, podrás consultarla aquí.
          </p>
          <Link
            href={"/shop" as Route}
            className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue mt-5 inline-flex min-h-12 touch-manipulation items-center rounded-xl px-5 font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/shop/orders/${order.id}` as Route}
                className="border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue focus-visible:ring-pool-blue group hover:shadow-elev-2 block touch-manipulation overflow-hidden rounded-2xl border transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="bg-pool-deep text-paper flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
                  <span className="font-display text-base font-extrabold tabular-nums">
                    Pedido {order.order_reference}
                  </span>
                  <span className="text-paper inline-flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {dateFormatter.format(new Date(order.approved_at ?? order.requested_at))}
                  </span>
                </div>

                <ul className="flex flex-col gap-2.5 px-4 py-3.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex min-w-0 items-start gap-3">
                      <span className="bg-pool-foam text-pool-deep inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1 font-mono text-sm font-extrabold tabular-nums">
                        {item.quantity}×
                      </span>
                      <span className="min-w-0 break-words">
                        <span className="text-pool-deep block text-base leading-snug font-extrabold">
                          {item.product_title ?? "Producto"}
                        </span>
                        {item.size || item.personalization ? (
                          <span className="text-ink-600 mt-0.5 block text-sm leading-snug font-semibold">
                            {[item.size ? `Talla ${item.size}` : null, item.personalization]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="bg-pool-ice flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-ink-700 text-sm font-bold">Total del pedido</span>
                  <span className="text-pool-blue inline-flex items-center gap-2 font-mono text-xl font-extrabold whitespace-nowrap tabular-nums">
                    {formatCents(order.total_cents, order.currency)}
                    <ChevronRight
                      className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

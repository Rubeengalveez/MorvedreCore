import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ChevronRight, PackageOpen, ReceiptText } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForPlayer } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { PageShell } from "@/components/ui/page-shell";
import { AppPageHero } from "@/components/ui/app-page-hero";
import { formatRelativeIso } from "@/lib/domain/calendar";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Mis pedidos — Morvedre Core" };

export default async function MyOrdersPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const orders = await getShopOrdersForPlayer(ctx.activeProfile.id);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <Link
        href={"/shop" as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la tienda
      </Link>
      <AppPageHero
        eyebrow="Seguimiento"
        title="Mis pedidos"
        description="Consulta el estado de tus solicitudes."
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
        <ul className="border-ink-200 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-2xl border shadow-sm">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/shop/orders/${order.id}` as Route}
                className="group hover:bg-pool-foam/35 focus-visible:ring-pool-blue flex min-h-28 touch-manipulation items-center gap-4 px-4 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
              >
                <span className="bg-pool-foam text-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                  <ReceiptText className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span className="text-ink-500 text-xs">
                      {formatRelativeIso(order.requested_at)}
                    </span>
                  </div>
                  <p className="text-pool-deep mt-2 font-mono text-xl font-extrabold tabular-nums">
                    {formatCents(order.total_cents, order.currency)}
                  </p>
                  <p className="text-ink-500 mt-0.5 text-sm">
                    {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <ChevronRight
                  className="text-ink-400 group-hover:text-pool-blue h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
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
        "rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide uppercase",
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

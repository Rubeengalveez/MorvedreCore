import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ShoppingCart, Inbox } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getPendingShopOrdersForParent } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ParentDecisionForm } from "./_components/parent-decision-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Solicitudes pendientes — Morvedre Core",
};

export default async function ParentPendingPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const orders = await getPendingShopOrdersForParent(ctx.activeProfile.id);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/shop" as Route}
          className="text-pool-blue inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          <ShoppingCart className="h-3 w-3" />
          Tienda
        </Link>
        <header className="flex items-center gap-2">
          <Inbox className="text-pool-deep h-6 w-6" aria-hidden="true" />
          <div>
            <Eyebrow>Solicitudes pendientes</Eyebrow>
            <h1 className="font-display text-pool-deep text-2xl font-extrabold">Aprobar compras</h1>
          </div>
        </header>
        <p className="text-ink-600 text-sm">
          Tu hijo/a quiere comprar algo. Revisa y aprueba o rechaza.
        </p>

        {orders.length === 0 ? (
          <div className="border-ink-300 bg-paper-card rounded-md border border-dashed p-6 text-center">
            <Inbox className="text-ink-300 mx-auto h-8 w-8" aria-hidden="true" />
            <p className="text-ink-600 mt-2 text-sm">No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {orders.map((o) => (
              <li
                key={o.id}
                className="border-ink-300 bg-paper-card shadow-elev-1 rounded-md border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-eyebrow text-ink-600">
                    {o.requested_by_name ?? "Tu hijo/a"} ·{" "}
                    {new Date(o.requested_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span
                    className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-extrabold tracking-wider uppercase"
                    style={{
                      backgroundColor: "var(--warning)20",
                      color: "var(--warning)",
                    }}
                  >
                    {SHOP_ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <p className="text-pool-deep mt-1 font-mono text-2xl font-extrabold">
                  {formatCents(o.total_cents, o.currency)}
                </p>
                <ul className="text-ink-600 mt-1 text-[11px]">
                  {o.items.map((i) => (
                    <li key={i.id} className="line-clamp-1">
                      · {i.quantity} × {i.product_title}
                      {i.size ? ` (${i.size})` : ""}
                    </li>
                  ))}
                </ul>
                {o.notes ? (
                  <p className="text-ink-700 mt-2 text-[11px] italic">“{o.notes}”</p>
                ) : null}
                <ParentDecisionForm orderId={o.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

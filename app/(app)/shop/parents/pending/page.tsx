import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ShoppingCart, Inbox } from "lucide-react";

import { AppPageHero } from "@/components/ui/app-page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getPendingShopOrdersForParent } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
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
    <PageShell width="md" className="gap-5 pb-8">
      <Link
        href={"/shop" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Tienda
      </Link>
      <AppPageHero
        eyebrow="Compras familiares"
        title="Aprobar compras"
        description="Revisa lo que se ha solicitado antes de aprobarlo o rechazarlo."
        icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
          title="No hay compras pendientes"
          description="Cuando un perfil vinculado solicite un producto, aparecerá aquí."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {orders.map((o) => (
            <li
              key={o.id}
              className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4"
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
                  className="inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-extrabold uppercase"
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
              <ul className="text-ink-600 mt-2 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="line-clamp-1">
                    · {i.quantity} × {i.product_title}
                    {i.size ? ` (${i.size})` : ""}
                  </li>
                ))}
              </ul>
              {o.notes ? <p className="text-ink-700 mt-2 text-sm italic">“{o.notes}”</p> : null}
              <ParentDecisionForm orderId={o.id} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

import { redirect } from "next/navigation";
import { Inbox, ShieldCheck } from "lucide-react";

import { AppPageHero } from "@/components/ui/app-page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
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
  if (ctx.linkedProfiles.length === 0) redirect("/shop");
  const [orders, initialPhone] = await Promise.all([
    getPendingShopOrdersForParent(ctx.ownProfile.id),
    getOwnProfilePhone(),
  ]);

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink href="/shop">Volver a la tienda</PageBackLink>
      <AppPageHero
        eyebrow="Control familiar"
        title="Compras por revisar"
        description="Nada llega a Sol hasta que tú lo apruebas."
        icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
      />

      <div className="bg-pool-deep text-paper flex items-start gap-3 rounded-2xl px-4 py-3.5">
        <ShieldCheck className="text-pool-ice mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-relaxed font-semibold">
          Comprueba producto, talla y personalización. Al aprobar, el pedido se envía a la persona
            encargada de la equipación.
        </p>
      </div>

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
              className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
            >
              <div className="bg-pool-foam/65 border-ink-200 flex items-center justify-between gap-2 border-b px-4 py-3">
                <span className="text-pool-deep text-sm font-extrabold">
                  {o.requested_by_name ?? "Tu hijo/a"}
                  <span className="text-pool-blue ml-2 text-xs font-extrabold">
                    {o.order_reference}
                  </span>
                  <span className="text-ink-500 ml-2 text-xs font-semibold">
                    {new Date(o.requested_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
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
              <div className="p-4">
                <ul className="divide-ink-200 divide-y">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex min-h-12 items-center gap-3 py-2 text-sm">
                      <span className="text-pool-deep font-mono font-extrabold">{i.quantity}×</span>
                      <span className="text-pool-deep min-w-0 flex-1 font-bold">
                        {i.product_title}
                        <span className="text-ink-500 mt-0.5 block text-xs font-semibold">
                          {[i.size ? `Talla ${i.size}` : null, i.personalization]
                            .filter(Boolean)
                            .join(" · ") || "Sin opciones"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {o.notes ? <p className="text-ink-700 mt-2 text-sm italic">“{o.notes}”</p> : null}
                <div className="border-ink-200 mt-3 flex items-end justify-between border-t pt-3">
                  <span className="text-ink-600 text-sm font-semibold">Total</span>
                  <strong className="text-pool-deep font-mono text-2xl tabular-nums">
                    {formatCents(o.total_cents, o.currency)}
                  </strong>
                </div>
                <ParentDecisionForm orderId={o.id} initialPhone={initialPhone} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

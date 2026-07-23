import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, PackageOpen, ReceiptText } from "lucide-react";

import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getShopOrder } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { PageShell } from "@/components/ui/page-shell";
import { cn } from "@/lib/utils/cn";
import { ParentDecisionForm } from "../../parents/pending/_components/parent-decision-form";

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
  const isFamilyOrder = ctx.linkedProfiles.some((profile) => profile.id === order.requested_by);
  const canDecide = isFamilyOrder && order.status === "pending_parent";
  const initialPhone = canDecide ? await getOwnProfilePhone() : null;
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(order.requested_at));

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <Link
        href={(isFamilyOrder ? "/shop/parents/pending" : "/shop/orders") as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isFamilyOrder ? "Compras familiares" : "Mis pedidos"}
      </Link>

      <header className="border-ink-200 bg-paper-card shadow-elev-2 rounded-[1.75rem] border p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
              Pedido {order.id.slice(0, 8)}
            </p>
            <h1 className="font-display text-pool-deep mt-2 text-2xl font-extrabold capitalize">
              {date}
            </h1>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="border-ink-200 mt-5 flex items-end justify-between gap-4 border-t pt-5">
          <span className="text-ink-600 text-base font-semibold">Total</span>
          <span className="text-pool-deep font-mono text-3xl font-extrabold tabular-nums">
            {formatCents(order.total_cents, order.currency)}
          </span>
        </div>
      </header>

      {canDecide ? (
        <section className="border-ball-gold/45 bg-ball-gold/10 rounded-2xl border p-4">
          <p className="text-pool-deep font-extrabold">Necesita tu aprobación</p>
          <p className="text-ink-600 mt-1 text-sm leading-relaxed font-semibold">
            Revisa los datos. Solo después de aprobarlo se enviará este pedido a la tienda.
          </p>
          <ParentDecisionForm orderId={order.id} initialPhone={initialPhone} />
        </section>
      ) : null}

      <section aria-labelledby="order-products-heading">
        <div className="mb-3 flex items-end justify-between px-1">
          <h2
            id="order-products-heading"
            className="font-display text-pool-deep text-xl font-extrabold"
          >
            Productos
          </h2>
          <span className="text-ink-500 text-sm tabular-nums">{order.items.length}</span>
        </div>
        <ul className="border-ink-200 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-2xl border shadow-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex min-h-24 items-center gap-3 px-4 py-3">
              {item.product_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product_image_url}
                  alt={item.product_title ?? "Producto"}
                  width={64}
                  height={80}
                  className="border-ink-200 h-20 w-16 shrink-0 rounded-xl border object-cover"
                />
              ) : (
                <span className="bg-pool-foam text-pool-deep flex h-20 w-16 shrink-0 items-center justify-center rounded-xl">
                  <PackageOpen className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-pool-deep line-clamp-2 text-base font-extrabold">
                  {item.product_title ?? "Producto"}
                </p>
                <p className="text-ink-500 mt-1 text-sm">
                  {item.size ? `Talla ${item.size}` : "Talla única"}
                </p>
                {item.personalization ? (
                  <p className="text-pool-blue mt-1 text-sm font-extrabold">
                    Personalización: {item.personalization}
                  </p>
                ) : null}
              </div>
              <p className="text-pool-deep shrink-0 font-mono text-base font-extrabold tabular-nums">
                {formatCents(item.subtotal_cents, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {order.notes ? <Note title="Personalización e indicaciones" text={order.notes} /> : null}
      {order.parent_notes ? <Note title="Nota familiar" text={order.parent_notes} /> : null}
      {order.admin_notes ? <Note title="Nota de la tienda" text={order.admin_notes} /> : null}
    </PageShell>
  );
}

function StatusBadge({ status }: { status: keyof typeof SHOP_ORDER_STATUS_LABELS }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1.5 text-xs font-extrabold tracking-wide uppercase",
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

function Note({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-pool-blue/20 bg-pool-foam rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <ReceiptText className="text-pool-blue h-5 w-5" aria-hidden="true" />
        <h2 className="font-display text-pool-deep text-base font-extrabold">{title}</h2>
      </div>
      <p className="text-ink-700 mt-2 text-base leading-relaxed whitespace-pre-line">{text}</p>
    </section>
  );
}

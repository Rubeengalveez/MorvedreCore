import type { Metadata, Route } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, PackageOpen, ReceiptText } from "lucide-react";

import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { cn } from "@/lib/utils/cn";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { getAdminAccess } from "@/server/actions/admin/_helpers";
import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getShopOrder } from "@/server/queries/shop";
import { ParentDecisionForm } from "../../parents/pending/_components/parent-decision-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Detalle del pedido — Morvedre Core",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const order = await getShopOrder(id);
  if (!order) notFound();

  const isOwnOrder = order.requested_by === ctx.ownProfile.id;
  const isFamilyOrder = ctx.linkedProfiles.some((profile) => profile.id === order.requested_by);
  const access =
    !isOwnOrder && !isFamilyOrder
      ? await getAdminAccess().catch(() => null)
      : null;
  const managesShop = Boolean(access?.isAdmin || access?.permissions.has("manage_shop"));
  const canDecide = isFamilyOrder && order.status === "pending_parent";
  const initialPhone = canDecide ? await getOwnProfilePhone() : null;

  const back =
    isOwnOrder
      ? { href: "/shop/orders" as Route, label: "Volver a mis pedidos" }
      : isFamilyOrder && order.status === "pending_parent"
        ? { href: "/shop/parents/pending" as Route, label: "Volver a compras familiares" }
        : managesShop
          ? { href: "/admin/shop" as Route, label: "Volver a gestión de pedidos" }
          : { href: "/shop" as Route, label: "Volver a la tienda" };

  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(order.requested_at));

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink href={back.href}>{back.label}</PageBackLink>

      <header className="border-ink-200 bg-paper-card shadow-elev-1 relative overflow-hidden rounded-2xl border">
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
        <div className="flex items-start justify-between gap-3 px-4 py-4 pl-5">
          <div className="min-w-0">
            <p className="text-pool-blue text-sm font-extrabold tracking-[0.08em] uppercase">
              Pedido
            </p>
            <h1 className="text-pool-deep mt-0.5 font-mono text-xl font-extrabold tracking-tight tabular-nums">
              {order.order_reference}
            </h1>
            <p className="text-ink-500 mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="capitalize">{formattedDate}</span>
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="border-ink-200 bg-paper-sunk/45 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-t px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-ink-500 text-sm font-bold">
              {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
            </p>
            <p className="text-ink-700 mt-0.5 text-sm leading-snug font-semibold">
              {statusDescription(order.status)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-ink-500 text-xs font-bold uppercase">Total</p>
            <p className="text-pool-deep font-mono text-2xl font-extrabold whitespace-nowrap tabular-nums">
              {formatCents(order.total_cents, order.currency)}
            </p>
          </div>
        </div>
      </header>

      {canDecide ? (
        <section className="border-ball-gold/45 bg-ball-gold/10 rounded-2xl border p-4">
          <p className="text-pool-deep font-extrabold">Necesita tu aprobación</p>
          <p className="text-ink-600 mt-1 text-sm leading-relaxed font-semibold">
            Comprueba producto, talla y personalización. Solo después de aprobarlo llegará a Sol.
          </p>
          <ParentDecisionForm orderId={order.id} initialPhone={initialPhone} />
        </section>
      ) : null}

      <section aria-labelledby="order-products-heading">
        <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
          <h2
            id="order-products-heading"
            className="font-display text-pool-deep text-xl font-extrabold"
          >
            Productos
          </h2>
          <span className="border-ink-200 bg-paper-card text-ink-600 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border px-2 text-sm font-extrabold tabular-nums">
            {order.items.length}
          </span>
        </div>
        <ul className="flex flex-col gap-2.5">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="border-ink-200 bg-paper-card shadow-elev-1 grid min-h-24 grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-2xl border p-3"
            >
              {item.product_image_url ? (
                <Image
                  src={item.product_image_url}
                  alt={item.product_title ?? "Producto"}
                  width={64}
                  height={80}
                  className="border-ink-200 h-20 w-16 rounded-xl border object-cover"
                />
              ) : (
                <span className="bg-pool-foam text-pool-deep flex h-20 w-16 items-center justify-center rounded-xl">
                  <PackageOpen className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-pool-deep line-clamp-2 text-base leading-snug font-extrabold">
                    {item.product_title ?? "Producto"}
                  </p>
                  {item.quantity > 1 ? (
                    <span className="bg-pool-foam text-pool-blue inline-flex min-h-6 shrink-0 items-center rounded-full px-2 text-xs font-extrabold">
                      ×{item.quantity}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="border-ink-200 bg-paper-sunk text-ink-700 rounded-full border px-2 py-0.5 text-sm font-bold">
                    {item.size ? `Talla ${item.size}` : "Talla única"}
                  </span>
                  {item.personalization ? (
                    <span className="border-pool-blue/20 bg-pool-foam text-pool-deep max-w-full break-words rounded-full border px-2 py-0.5 text-sm font-bold">
                      {item.personalization}
                    </span>
                  ) : null}
                </div>
                <p className="text-pool-deep mt-2 font-mono text-base font-extrabold tabular-nums">
                  {formatCents(item.subtotal_cents, order.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {order.notes ? <OrderNote title="Tus indicaciones" text={order.notes} /> : null}
      {order.parent_notes ? <OrderNote title="Nota familiar" text={order.parent_notes} /> : null}
      {order.admin_notes ? <OrderNote title="Nota de Sol" text={order.admin_notes} /> : null}
    </PageShell>
  );
}

function StatusBadge({ status }: { status: keyof typeof SHOP_ORDER_STATUS_LABELS }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-36 shrink-0 items-center rounded-full px-2.5 text-center text-xs leading-tight font-extrabold uppercase",
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

function OrderNote({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-pool-blue/20 bg-pool-foam/70 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <ReceiptText className="text-pool-blue h-5 w-5" aria-hidden="true" />
        <h2 className="font-display text-pool-deep text-base font-extrabold">{title}</h2>
      </div>
      <p className="text-ink-700 mt-2 text-base leading-relaxed whitespace-pre-line">{text}</p>
    </section>
  );
}

function statusDescription(status: keyof typeof SHOP_ORDER_STATUS_LABELS): string {
  if (status === "pending_parent") return "Esperando la aprobación de tu familia.";
  if (status === "pending_admin") return "Sol ya tiene la solicitud y la revisará.";
  if (status === "ordered") return "Sol ha encargado el material al proveedor.";
  if (status === "received") return "El material ya está en el club.";
  if (status === "delivered") return "Pedido entregado.";
  if (status === "rejected") return "La familia ha rechazado esta solicitud.";
  return "Pedido cancelado.";
}

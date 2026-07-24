"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Check, Truck, PackageCheck, Boxes, ChevronRight, X } from "lucide-react";

import { formatCents, type ShopOrderStatus } from "@/lib/domain/shop";
import { updateShopOrderStatus } from "@/server/actions/admin/shop";
import type { ShopOrder } from "@/server/queries/shop";

export interface AdminKanbanCardProps {
  order: ShopOrder;
}

const NEXT_STATUS: Record<ShopOrderStatus, ShopOrderStatus | null> = {
  pending_parent: null,
  pending_admin: "ordered",
  ordered: "received",
  received: "delivered",
  delivered: null,
  rejected: null,
  cancelled: null,
};

const NEXT_LABEL: Record<ShopOrderStatus, string> = {
  pending_parent: "Aprobado",
  pending_admin: "Ya está pedido",
  ordered: "Ya ha llegado",
  received: "Ya está entregado",
  delivered: "",
  rejected: "",
  cancelled: "",
};

const NEXT_ICON: Record<ShopOrderStatus, React.ComponentType<{ className?: string }>> = {
  pending_parent: Check,
  pending_admin: Truck,
  ordered: PackageCheck,
  received: Boxes,
  delivered: Check,
  rejected: Check,
  cancelled: Check,
};

export function AdminKanbanCard({ order }: AdminKanbanCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_STATUS[order.status];

  function advance() {
    if (!next) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateShopOrderStatus({ order_id: order.id, status: next });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  function cancel() {
    setError(null);
    startTransition(async () => {
      try {
        await updateShopOrderStatus({ order_id: order.id, status: "cancelled" });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  return (
    <article
      data-kanban-card={order.id}
      className="border-ink-300 bg-paper shadow-elev-1 flex flex-col gap-3 rounded-2xl border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/shop/orders/${order.id}` as Route}
          className="text-pool-blue focus-visible:ring-pool-blue rounded text-base font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Pedido {order.order_reference}
        </Link>
        <span className="text-ink-500 shrink-0 text-sm font-semibold">
          {new Date(order.requested_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
      <p className="text-pool-deep line-clamp-1 text-base font-extrabold">
        {order.requested_by_name ?? "Jugador"}
      </p>
      <ul className="bg-paper-sunk text-ink-700 flex flex-col gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold">
        {order.items.slice(0, 2).map((i) => (
          <li key={i.id} className="line-clamp-1">
            {i.quantity} × {i.product_title ?? "Producto"}
            {i.size ? ` · ${i.size}` : ""}
            {i.personalization ? ` · ${i.personalization}` : ""}
          </li>
        ))}
        {order.items.length > 2 ? (
          <li className="text-ink-500">Y {order.items.length - 2} más</li>
        ) : null}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <span className="text-ink-500 text-sm font-semibold">Total</span>
        <p className="text-pool-deep font-mono text-xl font-extrabold tabular-nums">
          {formatCents(order.total_cents, order.currency)}
        </p>
      </div>
      {error ? (
        <div
          role="alert"
          className="border-goggle-red/30 bg-goggle-red/5 text-goggle-red rounded-xl border px-3 py-2 text-sm font-semibold"
        >
          {error}
        </div>
      ) : null}
      <Link
        href={`/shop/orders/${order.id}` as Route}
        className="border-ink-300 text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-base font-extrabold focus-visible:ring-2 focus-visible:outline-none"
      >
        Ver detalle
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Link>
      <div className="flex flex-wrap gap-2">
        {next ? (
          <button
            type="button"
            onClick={advance}
            disabled={pending}
            className="bg-pool-deep text-paper hover:bg-ink-900 inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold disabled:opacity-50"
          >
            {(() => {
              const Icon = NEXT_ICON[order.status];
              return <Icon className="h-4 w-4" aria-hidden="true" />;
            })()}
            {NEXT_LABEL[order.status]}
          </button>
        ) : null}
        {order.status !== "delivered" && order.status !== "cancelled" ? (
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="border-ink-300 bg-paper text-goggle-red hover:bg-goggle-red/5 inline-flex h-12 w-12 touch-manipulation items-center justify-center rounded-xl border disabled:opacity-50"
            aria-label="Cancelar pedido"
            title="Cancelar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

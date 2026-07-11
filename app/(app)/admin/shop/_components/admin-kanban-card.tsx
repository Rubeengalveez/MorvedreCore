"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Check, Truck, PackageCheck, Boxes, X } from "lucide-react";

import { formatCents, type ShopOrderStatus } from "@/lib/domain/shop";
import { updateShopOrderStatus } from "@/server/actions/admin/shop";
import type { ShopOrder } from "@/server/queries/shop";

export interface AdminKanbanCardProps {
  order: ShopOrder;
}

const NEXT_STATUS: Record<ShopOrderStatus, ShopOrderStatus | null> = {
  pending_parent: "pending_admin",
  pending_admin: "ordered",
  ordered: "received",
  received: "delivered",
  delivered: null,
  rejected: null,
  cancelled: null,
};

const NEXT_LABEL: Record<ShopOrderStatus, string> = {
  pending_parent: "Aprobado",
  pending_admin: "Pedir",
  ordered: "Recibido",
  received: "Entregado",
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
      className="border-ink-300 bg-paper shadow-elev-1 flex flex-col gap-1.5 rounded-md border p-2.5"
    >
      <div className="flex items-center justify-between gap-1">
        <Link
          href={`/shop/orders/${order.id}` as Route}
          className="text-eyebrow text-ink-600 hover:underline"
        >
          {order.id.slice(0, 8)}
        </Link>
        <span className="text-ink-500 text-xs">
          {new Date(order.requested_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
      <p className="text-pool-deep line-clamp-1 text-xs font-extrabold">
        {order.requested_by_name ?? "Jugador"}
      </p>
      <ul className="text-ink-600 text-xs">
        {order.items.slice(0, 2).map((i) => (
          <li key={i.id} className="line-clamp-1">
            · {i.quantity} × {i.product_title ?? "?"}
          </li>
        ))}
        {order.items.length > 2 ? (
          <li className="text-ink-500">+{order.items.length - 2} más</li>
        ) : null}
      </ul>
      <p className="text-pool-deep font-mono text-sm font-extrabold">
        {formatCents(order.total_cents, order.currency)}
      </p>
      {error ? (
        <div
          role="alert"
          className="border-goggle-red/30 bg-goggle-red/5 text-goggle-red rounded border px-1.5 py-0.5 text-xs"
        >
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {next ? (
          <button
            type="button"
            onClick={advance}
            disabled={pending}
            className="bg-pool-deep text-paper hover:bg-ink-900 touch-target inline-flex h-10 flex-1 items-center justify-center gap-1 rounded px-2 text-xs font-extrabold tracking-wider uppercase disabled:opacity-50"
          >
            {(() => {
              const Icon = NEXT_ICON[order.status];
              return <Icon className="h-3 w-3" />;
            })()}
            {NEXT_LABEL[order.status]}
          </button>
        ) : null}
        {order.status !== "delivered" && order.status !== "cancelled" ? (
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="border-ink-300 bg-paper text-ink-700 hover:bg-paper-sunk touch-target inline-flex h-10 w-10 items-center justify-center rounded border disabled:opacity-50"
            aria-label="Cancelar pedido"
            title="Cancelar"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

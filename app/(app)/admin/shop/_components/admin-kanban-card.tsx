"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Check, Truck, PackageCheck, Boxes, X, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CapTile } from "@/components/ui/cap-tile";
import { formatCents } from "@/lib/domain/shop";
import type { ShopOrderStatus } from "@/lib/domain/shop";
import { updateShopOrderStatus } from "@/server/actions/admin/shop";
import type { ShopOrder, ShopProduct } from "@/server/queries/shop";

export interface AdminKanbanCardProps {
  order: ShopOrder;
  productById: Map<string, ShopProduct>;
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
      className="flex flex-col gap-1.5 rounded-md border border-ink-300 bg-paper p-2.5 shadow-elev-1"
    >
      <div className="flex items-center justify-between gap-1">
        <Link
          href={`/shop/orders/${order.id}` as Route}
          className="text-[10px] font-bold uppercase tracking-wider text-ink-600 hover:underline"
        >
          {order.id.slice(0, 8)}
        </Link>
        <span className="text-[10px] text-ink-500">
          {new Date(order.requested_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
      <p className="line-clamp-1 text-xs font-extrabold text-pool-deep">
        {order.requested_by_name ?? "Jugador"}
      </p>
      <ul className="text-[10px] text-ink-600">
        {order.items.slice(0, 2).map((i) => (
          <li key={i.id} className="line-clamp-1">
            · {i.quantity} × {i.product_title ?? "?"}
          </li>
        ))}
        {order.items.length > 2 ? (
          <li className="text-ink-500">+{order.items.length - 2} más</li>
        ) : null}
      </ul>
      <p className="font-mono text-sm font-extrabold text-pool-deep">
        {formatCents(order.total_cents, order.currency)}
      </p>
      {error ? (
        <div
          role="alert"
          className="rounded border border-goggle-red/30 bg-goggle-red/5 px-1.5 py-0.5 text-[10px] text-goggle-red"
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
            className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded bg-pool-deep px-1.5 text-[10px] font-extrabold uppercase tracking-wider text-paper hover:bg-ink-900 disabled:opacity-50"
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
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-ink-300 bg-paper text-ink-700 hover:bg-paper-sunk disabled:opacity-50"
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

void CapTile;
void MessageSquare;
void Button;

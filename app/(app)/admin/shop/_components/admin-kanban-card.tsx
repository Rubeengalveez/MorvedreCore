"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Check, Truck, PackageCheck, Boxes, ChevronRight, X } from "lucide-react";

import { formatCents, type ShopOrderStatus } from "@/lib/domain/shop";
import { updateShopOrderStatus } from "@/server/actions/admin/shop";
import type { ShopOrder } from "@/server/queries/shop";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

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

const STATUS_BADGE_CONFIG: Record<
  ShopOrderStatus,
  { variant: "warning" | "info" | "success" | "danger" | "neutral"; label: string }
> = {
  pending_parent: { variant: "warning", label: "Firma padre" },
  pending_admin: { variant: "warning", label: "Pendiente" },
  ordered: { variant: "info", label: "Encargado" },
  received: { variant: "info", label: "Recibido" },
  delivered: { variant: "success", label: "Entregado" },
  rejected: { variant: "danger", label: "Rechazado" },
  cancelled: { variant: "neutral", label: "Cancelado" },
};

export function AdminKanbanCard({ order }: AdminKanbanCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_STATUS[order.status];
  const badgeConfig = STATUS_BADGE_CONFIG[order.status];

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

  const NextIcon = next ? NEXT_ICON[order.status] : null;

  return (
    <Card data-kanban-card={order.id} className="gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href={`/shop/orders/${order.id}` as Route}
            className="text-pool-blue focus-visible:ring-pool-blue rounded text-base font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Pedido {order.order_reference}
          </Link>
          <span className="text-ink-500 text-xs font-semibold">
            {new Date(order.requested_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        {badgeConfig ? (
          <StatusBadge variant={badgeConfig.variant} size="sm">
            {badgeConfig.label}
          </StatusBadge>
        ) : null}
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
      <Button asChild variant="outline" className="w-full">
        <Link href={`/shop/orders/${order.id}` as Route}>
          Ver detalle
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </Button>
      <div className="flex flex-wrap gap-2">
        {next && NextIcon ? (
          <Button
            type="button"
            variant="primary"
            onClick={advance}
            disabled={pending}
            className="flex-1"
          >
            <NextIcon className="h-4 w-4" aria-hidden="true" />
            {NEXT_LABEL[order.status]}
          </Button>
        ) : null}
        {order.status !== "delivered" && order.status !== "cancelled" ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={cancel}
            disabled={pending}
            className="text-goggle-red hover:bg-goggle-red/5 border-ink-300"
            aria-label="Cancelar pedido"
            title="Cancelar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

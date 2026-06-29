import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ShoppingCart, Check, X, Package } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForPlayer } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CapTile } from "@/components/ui/cap-tile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Mis pedidos — Morvedre Core",
};

const STATUS_COLOR: Record<string, string> = {
  pending_parent: "var(--warning)",
  pending_admin: "var(--pool-blue)",
  rejected: "var(--goggle-red)",
  ordered: "var(--pool-teal)",
  received: "var(--pool-blue)",
  delivered: "var(--success)",
  cancelled: "var(--ink-500)",
};

const STATUS_EMOJI: Record<string, string> = {
  pending_parent: "🟡",
  pending_admin: "🟢",
  rejected: "❌",
  ordered: "📦",
  received: "📥",
  delivered: "✅",
  cancelled: "🚫",
};

export default async function MyOrdersPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const orders = await getShopOrdersForPlayer(ctx.activeProfile.id);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/shop" as Route}
          className="inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Tienda
        </Link>
        <header className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-pool-deep" aria-hidden="true" />
          <div>
            <Eyebrow>Mis pedidos</Eyebrow>
            <h1 className="font-display text-2xl font-extrabold text-pool-deep">
              Solicitudes de compra
            </h1>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-300 bg-paper-card p-6 text-center">
            <Package className="mx-auto h-8 w-8 text-ink-300" aria-hidden="true" />
            <p className="mt-2 text-sm text-ink-600">
              Aún no has hecho ninguna solicitud.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/shop/orders/${o.id}` as Route}
                  className="block rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1 transition-shadow hover:shadow-elev-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                      {formatRelative(o.requested_at)}
                    </span>
                    <span
                      className="inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-extrabold uppercase tracking-wider"
                      style={{
                        backgroundColor: STATUS_COLOR[o.status] + "20",
                        color: STATUS_COLOR[o.status],
                      }}
                    >
                      <span aria-hidden="true">{STATUS_EMOJI[o.status]}</span>
                      {SHOP_ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xl font-extrabold text-pool-deep">
                    {formatCents(o.total_cents, o.currency)}
                  </p>
                  <p className="text-[11px] text-ink-600">
                    {o.items.length} producto{o.items.length === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (abs < min) return "ahora mismo";
  if (abs < hr) return Math.round(abs / min) + " min";
  if (abs < day) return Math.round(abs / hr) + " h";
  if (abs < 7 * day) return Math.round(abs / day) + " d";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

void Check;
void X;
void CapTile;

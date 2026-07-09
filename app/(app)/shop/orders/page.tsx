import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForPlayer } from "@/server/queries/shop";
import { SHOP_ORDER_STATUS_LABELS, formatCents } from "@/lib/domain/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatRelativeIso } from "@/lib/domain/calendar";

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
          className="text-pool-blue inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Tienda
        </Link>
        <header className="flex items-center gap-2">
          <ShoppingCart className="text-pool-deep h-6 w-6" aria-hidden="true" />
          <div>
            <Eyebrow>Mis pedidos</Eyebrow>
            <h1 className="font-display text-pool-deep text-2xl font-extrabold">
              Solicitudes de compra
            </h1>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="border-ink-300 bg-paper-card rounded-md border border-dashed p-6 text-center">
            <Package className="text-ink-300 mx-auto h-8 w-8" aria-hidden="true" />
            <p className="text-ink-600 mt-2 text-sm">Aún no has hecho ninguna solicitud.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/shop/orders/${o.id}` as Route}
                  className="border-ink-300 bg-paper-card shadow-elev-1 hover:shadow-elev-2 block rounded-md border p-3 transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-eyebrow text-ink-600">
                      {formatRelative(o.requested_at)}
                    </span>
                    <span
                      className="inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-extrabold tracking-wider uppercase"
                      style={{
                        backgroundColor: STATUS_COLOR[o.status] + "20",
                        color: STATUS_COLOR[o.status],
                      }}
                    >
                      <span aria-hidden="true">{STATUS_EMOJI[o.status]}</span>
                      {SHOP_ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <p className="text-pool-deep mt-1 font-mono text-xl font-extrabold">
                    {formatCents(o.total_cents, o.currency)}
                  </p>
                  <p className="text-ink-600 text-[11px]">
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
  return formatRelativeIso(iso);
}

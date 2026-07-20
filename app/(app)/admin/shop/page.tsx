import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  Plus,
  Boxes,
  ShoppingCart,
  Bell,
  Truck,
  PackageCheck,
  Download,
  ShoppingBasket,
} from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForKanban } from "@/server/queries/shop";
import { SHOP_KANBAN_COLUMNS } from "@/lib/domain/shop";
import type { ShopOrderStatus } from "@/lib/domain/shop";
import type { ShopOrder } from "@/server/queries/shop";
import { AdminKanbanCard } from "./_components/admin-kanban-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tienda (admin) — Morvedre Core",
};

const STATUS_ICON: Record<ShopOrderStatus, React.ComponentType<{ className?: string }>> = {
  pending_parent: Bell,
  pending_admin: ShoppingCart,
  ordered: Truck,
  received: PackageCheck,
  delivered: Boxes,
  rejected: Bell,
  cancelled: Bell,
};

export default async function AdminShopPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const kanbanStatuses: ShopOrderStatus[] = ["pending_admin", "ordered", "received", "delivered"];
  const orders = await getShopOrdersForKanban(kanbanStatuses);

  const ordersByStatus = new Map<ShopOrderStatus, ShopOrder[]>();
  for (const s of kanbanStatuses) ordersByStatus.set(s, []);
  for (const o of orders) {
    const list = ordersByStatus.get(o.status);
    if (list) list.push(o);
  }

  return (
    <AdminPageShell width="lg">
      <AdminPageHeader
        eyebrow="Gestión de tienda"
        title="Pedidos del club"
        description="Prepara, encarga y entrega cada pedido sin perder su estado."
        icon={<ShoppingBasket className="h-6 w-6" aria-hidden="true" />}
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <a
              href="/api/shop/orders/export"
              className="border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Download className="h-5 w-5" aria-hidden="true" /> Excel
            </a>
            <Link
              href={"/admin/shop/products/new" as Route}
              className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Plus className="h-5 w-5" aria-hidden="true" /> Producto
            </Link>
          </div>
        }
      />

      <ol className="border-pool-blue/20 bg-pool-foam/45 grid grid-cols-1 gap-2 rounded-2xl border p-3 sm:grid-cols-3">
        {[
          ["1", "Revisa", "Abre las nuevas solicitudes."],
          ["2", "Actualiza", "Marca cuándo se encarga y se recibe."],
          ["3", "Entrega", "Cierra el pedido al dárselo a la persona."],
        ].map(([step, title, detail]) => (
          <li key={step} className="bg-paper-card flex items-center gap-3 rounded-xl p-3 shadow-sm">
            <span className="bg-pool-deep text-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono font-extrabold">
              {step}
            </span>
            <span>
              <span className="text-pool-deep block text-sm font-extrabold">{title}</span>
              <span className="text-ink-600 block text-xs leading-snug">{detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 pb-3 md:flex-row md:overflow-x-auto">
        {SHOP_KANBAN_COLUMNS.filter((col) => col.id !== "pending_parent").map((col) => {
          const list = ordersByStatus.get(col.id) ?? [];
          const Icon = STATUS_ICON[col.id];
          return (
            <section
              key={col.id}
              className="border-ink-200 bg-paper-card shadow-elev-1 flex w-full shrink-0 flex-col gap-2 rounded-2xl border p-3 md:w-72"
              data-kanban-column={col.id}
            >
              <header className="flex items-center justify-between gap-2 px-1 py-1">
                <span className="text-pool-deep inline-flex items-center gap-2 text-sm font-extrabold">
                  <Icon className="text-pool-blue h-4 w-4" aria-hidden="true" />
                  {col.title}
                </span>
                <span className="bg-pool-foam text-pool-deep rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums">
                  {list.length}
                </span>
              </header>
              <ul className="flex flex-col gap-1.5">
                {list.length === 0 ? (
                  <li className="border-ink-200 bg-paper-sunk/30 text-ink-500 rounded-xl border border-dashed p-4 text-center text-sm font-semibold">
                    Sin pedidos
                  </li>
                ) : (
                  list.map((o) => (
                    <li key={o.id}>
                      <AdminKanbanCard order={o} />
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </AdminPageShell>
  );
}

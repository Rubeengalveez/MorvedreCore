import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Plus, Boxes, ShoppingCart, Bell, Truck, PackageCheck, Download } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { getShopOrdersForKanban } from "@/server/queries/shop";
import { SHOP_KANBAN_COLUMNS } from "@/lib/domain/shop";
import type { ShopOrderStatus } from "@/lib/domain/shop";
import type { ShopOrder } from "@/server/queries/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CapTile } from "@/components/ui/cap-tile";
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

async function isAdmin(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  return !!data;
}

export default async function AdminShopPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  if (!(await isAdmin(ctx.activeProfile.id))) redirect("/dashboard");

  const kanbanStatuses: ShopOrderStatus[] = [
    "pending_parent",
    "pending_admin",
    "ordered",
    "received",
    "delivered",
  ];
  const orders = await getShopOrdersForKanban(kanbanStatuses);

  const ordersByStatus = new Map<ShopOrderStatus, ShopOrder[]>();
  for (const s of kanbanStatuses) ordersByStatus.set(s, []);
  for (const o of orders) {
    const list = ordersByStatus.get(o.status);
    if (list) list.push(o);
  }

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CapTile number={9} teamColor="var(--pool-deep)" size="sm" />
            <div>
              <Eyebrow>Gestión tienda</Eyebrow>
              <h1 className="font-display text-pool-deep text-2xl font-extrabold">
                Kanban de pedidos
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/api/shop/orders/export"
              className="border-ink-300 bg-paper-card text-pool-deep inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-bold"
            >
              <Download className="h-4 w-4" /> Excel
            </a>
            <Link
              href={"/admin/shop/products/new" as Route}
              className="bg-pool-deep text-paper hover:bg-ink-900 inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> Producto
            </Link>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-3">
          {SHOP_KANBAN_COLUMNS.map((col) => {
            const list = ordersByStatus.get(col.id) ?? [];
            const Icon = STATUS_ICON[col.id];
            return (
              <section
                key={col.id}
                className="border-ink-300 bg-paper-card flex w-72 shrink-0 flex-col gap-2 rounded-md border p-2"
                data-kanban-column={col.id}
              >
                <header className="flex items-center justify-between gap-2 px-1 py-1">
                  <span className="text-pool-deep inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase">
                    <Icon className="h-3.5 w-3.5" />
                    {col.emoji} {col.title}
                  </span>
                  <span className="bg-ink-200 text-ink-700 rounded-full px-2 text-[10px] font-bold">
                    {list.length}
                  </span>
                </header>
                <ul className="flex flex-col gap-1.5">
                  {list.length === 0 ? (
                    <li className="border-ink-300 bg-paper-sunk/30 text-ink-500 rounded border border-dashed p-3 text-center text-[10px]">
                      Vacío
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
      </div>
    </div>
  );
}

"use client";

import { ArrowLeft, UsersRound } from "lucide-react";
import { isActiveShopOrder, shopMoney, type ManagedShopOrder } from "@/lib/domain/shop-management";
import { ShopOrderCard } from "./shop-order-card";
import { ShopSection } from "./shop-ui";

export function ShopFamilyHistory({
  family,
  returnTo,
}: {
  family: {
    members: Array<{ id: string; full_name: string; relationship: string }>;
    orders: ManagedShopOrder[];
  };
  returnTo: string;
}) {
  const active = family.orders.filter(
    (order) => isActiveShopOrder(order) || order.status === "pending_parent",
  );
  const delivered = family.orders.filter((order) => order.status === "delivered");
  const amount = [...active, ...delivered].reduce((sum, order) => sum + order.total_cents, 0);
  return (
    <div className="text-pool-deep space-y-4">
      <a
        href={returnTo}
        className="text-pool-blue inline-flex min-h-12 items-center gap-2 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Volver a pedidos
      </a>
      <header className="border-pool-deep/70 flex items-center gap-3 rounded-2xl border-2 bg-white p-4">
        <span className="bg-pool-deep flex h-12 w-12 items-center justify-center rounded-xl text-white">
          <UsersRound aria-hidden="true" />
        </span>
        <div>
          <p className="text-pool-blue text-sm font-bold">Tienda del club</p>
          <h1 className="text-2xl font-extrabold">
            {family.members.length > 1 ? "Historial de la familia" : "Historial de pedidos"}
          </h1>
        </div>
      </header>
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Pedidos", family.orders.length],
          ["Activos", active.length],
          ["Entregados", delivered.length],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-pool-deep/70 rounded-xl border-2 bg-white p-3 text-center"
          >
            <dt className="text-sm font-bold">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="border-pool-deep/70 bg-pool-foam flex items-center justify-between rounded-xl border-2 p-4">
        <span className="font-bold">Importe de los pedidos</span>
        <strong className="text-xl tabular-nums">{shopMoney(amount)}</strong>
      </div>
      <ShopSection title={family.members.length > 1 ? "Familia" : "Socio"}>
        <div className="space-y-3">
          {["Madre / padre", "Hijo / hija", "Socio"].map((role) => {
            const members = family.members.filter((member) => member.relationship === role);
            if (!members.length) return null;
            return (
              <div key={role} className="border-pool-deep/65 bg-pool-foam rounded-xl border p-3">
                {family.members.length > 1 && (
                  <p className="text-pool-blue mb-2 text-sm font-bold">
                    {role === "Madre / padre" ? "Madres y padres" : "Hijos"}
                  </p>
                )}
                {members.map((member) => (
                  <p key={member.id} className="py-1 font-extrabold">
                    {member.full_name}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </ShopSection>
      <h2 className="border-pool-deep bg-pool-deep rounded-xl border-2 px-4 py-3 text-lg font-extrabold text-white">
        Historial de pedidos
      </h2>
      <div className="space-y-3">
        {family.orders.map((order) => (
          <ShopOrderCard key={order.id} order={order} showStatus readonly />
        ))}
        {!family.orders.length && (
          <p className="border-pool-deep/70 rounded-xl border-2 bg-white p-5 font-bold">
            Todavía no hay pedidos.
          </p>
        )}
      </div>
    </div>
  );
}

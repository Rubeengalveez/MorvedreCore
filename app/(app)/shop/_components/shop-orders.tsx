"use client";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, PackageOpen, Search } from "lucide-react";
import type { ShopOrder } from "@/server/queries/shop";
import { shopMoney, matchesShopSearch } from "@/lib/domain/shop-management";
import { ShopOrderStatus } from "@/components/shop/shop-order-status";
import { ShopPersonName } from "@/components/shop/shop-person-name";
import { shopControl, shopPrimary } from "@/components/shop/shop-ui";
export function ShopOrders({
  orders,
  origin,
  initialHistory = false,
  initialQuery = "",
}: {
  orders: ShopOrder[];
  origin?: "profile";
  initialHistory?: boolean;
  initialQuery?: string;
}) {
  const [history, setHistory] = useState(initialHistory),
    [query, setQuery] = useState(initialQuery);
  const returnParams = new URLSearchParams();
  if (origin) returnParams.set("from", origin);
  if (history) returnParams.set("history", "1");
  if (query) returnParams.set("q", query);
  const archived = (order: ShopOrder) =>
    ["delivered", "rejected", "cancelled"].includes(order.status);
  const visible = orders.filter(
    (order) =>
      archived(order) === history &&
      matchesShopSearch(
        [
          order.order_reference,
          order.requested_by_name,
          ...order.items.flatMap((item) => [item.product_title, item.personalization, item.size]),
        ]
          .filter(Boolean)
          .join(" "),
        query,
      ),
  );
  return (
    <>
      <div className="relative">
        <Search
          className="text-pool-deep pointer-events-none absolute top-4 left-3 h-5 w-5"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Buscar en mis pedidos"
          placeholder="Buscar pedido o producto…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${shopControl} pl-10`}
        />
      </div>
      <div role="group" aria-label="Estado de los pedidos" className="grid grid-cols-2 gap-3">
        {[
          { value: false, label: "Activos" },
          { value: true, label: "Historial" },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={history === tab.value}
            onClick={() => setHistory(tab.value)}
            className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 px-3 text-base font-extrabold ${history === tab.value ? "border-pool-deep bg-pool-deep text-white" : "border-pool-deep/65 text-pool-deep bg-white"}`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-md px-2 py-1 text-sm tabular-nums ${history === tab.value ? "bg-white/15" : "bg-blue-50"}`}
            >
              {orders.filter((order) => archived(order) === tab.value).length}
            </span>
          </button>
        ))}
      </div>
      <p role="status" className="sr-only">
        {visible.length} pedidos encontrados
      </p>
      {visible.length ? (
        <ul className="space-y-3">
          {visible.map((order) => (
            <li key={order.id}>
              <Link
                href={
                  `/shop/orders/${order.id}${returnParams.size ? `?${returnParams}` : ""}` as Route
                }
                className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue block overflow-hidden rounded-2xl border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="bg-pool-deep flex items-center justify-between gap-3 px-4 py-3 text-white">
                  <strong>{order.order_reference}</strong>
                  <span className="text-sm font-semibold">
                    {new Date(order.requested_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <ShopPersonName
                      name={order.requested_by_name ?? "Tu pedido"}
                      className="font-extrabold"
                    />
                    <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                  </div>
                  <ShopOrderStatus status={order.status} />
                  <ul className="space-y-2">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex gap-2 rounded-lg bg-slate-100 px-3 py-2">
                        <span className="font-extrabold tabular-nums">{item.quantity}×</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold [overflow-wrap:anywhere]">
                            {item.product_title ?? "Producto"}
                          </span>
                          {item.size || item.personalization ? (
                            <span className="block text-sm font-semibold [overflow-wrap:anywhere] text-slate-700">
                              {[item.size ? `Talla ${item.size}` : null, item.personalization]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-pool-deep/65 flex items-center justify-between gap-3 rounded-xl border bg-blue-50 px-3 py-2">
                    <span className="font-bold">Total</span>
                    <strong className="text-xl tabular-nums">{shopMoney(order.total_cents)}</strong>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-pool-deep/65 text-pool-deep space-y-3 rounded-2xl border-2 bg-white px-5 py-8 text-center">
          <PackageOpen className="mx-auto h-10 w-10" aria-hidden="true" />
          <h2 className="text-xl font-extrabold">
            {query
              ? "No encontramos ese pedido"
              : history
                ? "Aún no hay pedidos finalizados"
                : "No tienes pedidos activos"}
          </h2>
          <Link href="/shop" className={shopPrimary}>
            Ver productos
          </Link>
        </div>
      )}
    </>
  );
}

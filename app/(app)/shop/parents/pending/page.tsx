import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ShopNavigation } from "@/components/shop/shop-navigation";
import { ShopContact } from "@/components/shop/shop-contact";
import { ShopOrderItems } from "@/components/shop/shop-order-items";
import { ShopSection, shopSecondary } from "@/components/shop/shop-ui";
import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getPendingShopOrdersForParent } from "@/server/queries/shop";
import { ParentDecisionForm } from "./_components/parent-decision-form";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Pedidos familiares — Morvedre Core" };
export default async function ParentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const from = (await searchParams).from;
  const origin = from === "family";
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  if (!ctx.linkedProfiles.length) redirect("/shop");
  const [orders, phone] = await Promise.all([
    getPendingShopOrdersForParent(ctx.ownProfile.id),
    getOwnProfilePhone(),
  ]);
  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink
        href={origin ? ("/profile/family" as Route) : from === "dashboard" ? "/dashboard" : "/shop"}
      >
        {origin ? "Mi familia" : from === "dashboard" ? "Inicio" : "Volver a la tienda"}
      </PageBackLink>
      <h1 className="text-pool-deep text-3xl font-extrabold">Pedidos por aprobar</h1>
      <ShopNavigation profileId={ctx.ownProfile.id} active="orders" />
      {orders.length ? (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <ShopSection title={order.requested_by_name ?? "Pedido familiar"}>
                <Link
                  href={`/shop/orders/${order.id}${origin ? "?from=family" : ""}` as Route}
                  className={`${shopSecondary} w-full`}
                >
                  Ver pedido {order.order_reference}
                </Link>
                <ShopOrderItems order={order} />
                <ParentDecisionForm
                  orderId={order.id}
                  initialPhone={phone}
                  totalCents={order.total_cents}
                />
              </ShopSection>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-pool-deep/65 text-pool-deep space-y-3 rounded-2xl border-2 bg-white p-6 text-center">
          <h2 className="text-xl font-extrabold">No hay pedidos por aprobar</h2>
          <Link href="/shop/orders" className={shopSecondary}>
            Ver mis pedidos
          </Link>
        </div>
      )}
      <ShopContact message="Hola Sol, tengo una duda sobre la aprobación de un pedido familiar de la tienda de Morvedre Core." />
    </PageShell>
  );
}

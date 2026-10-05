import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { ShopNavigation } from "@/components/shop/shop-navigation";
import { ShopContact } from "@/components/shop/shop-contact";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopOrdersForProfiles } from "@/server/queries/shop";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ShopOrders } from "../_components/shop-orders";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Mis pedidos — Morvedre Core" };
export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ history?: string; q?: string; from?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const filters = await searchParams;
  const orders = await getShopOrdersForProfiles([
    ctx.ownProfile.id,
    ...ctx.linkedProfiles.map((profile) => profile.id),
  ]);
  return (
    <PageShell width="md" className="gap-4 pb-8">
      {filters.from === "profile" && <PageBackLink href="/profile">Mi perfil</PageBackLink>}
      <h1 className="text-pool-deep text-3xl font-extrabold">Mis pedidos</h1>
      <ShopNavigation profileId={ctx.ownProfile.id} active="orders" />
      <ShopOrders
        orders={orders}
        origin={filters.from === "profile" ? "profile" : undefined}
        initialHistory={filters.history === "1"}
        initialQuery={typeof filters.q === "string" ? filters.q.slice(0, 200) : ""}
      />
      <ShopContact message="Hola Sol, tengo una duda sobre mis pedidos de la tienda de Morvedre Core." />
    </PageShell>
  );
}

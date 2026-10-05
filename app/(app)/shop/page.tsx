import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { ShopNavigation } from "@/components/shop/shop-navigation";
import { ShopContact } from "@/components/shop/shop-contact";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getPendingShopOrdersForParent, getShopProducts } from "@/server/queries/shop";
import { ShopCatalog } from "./_components/shop-catalog";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Tienda — Morvedre Core" };
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const [products, familyOrders, state] = await Promise.all([
    getShopProducts({ availableOnly: true }),
    ctx.linkedProfiles.length
      ? getPendingShopOrdersForParent(ctx.ownProfile.id)
      : Promise.resolve([]),
    searchParams,
  ]);
  return (
    <PageShell width="md" className="gap-4 pb-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-pool-deep text-3xl font-extrabold">Tienda</h1>
        <span className="border-pool-deep/65 text-pool-deep rounded-lg border bg-white px-3 py-1.5 text-sm font-bold">
          Waterpolo Morvedre
        </span>
      </header>
      <ShopNavigation profileId={ctx.ownProfile.id} active="products" />
      <ShopCatalog
        products={products}
        initialQuery={state.q ?? ""}
        initialCategory={state.category ?? ""}
        familyPending={familyOrders.length}
      />
      <ShopContact />
    </PageShell>
  );
}

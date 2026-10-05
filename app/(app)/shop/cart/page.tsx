import { redirect } from "next/navigation";
import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getShopProducts } from "@/server/queries/shop";
import { PageShell } from "@/components/ui/page-shell";
import { ShopNavigation } from "@/components/shop/shop-navigation";
import { ShopContact } from "@/components/shop/shop-contact";
import { CartClient } from "../_components/cart-client";
import { requiresGuardianApproval } from "@/lib/domain/family";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Carrito — Morvedre Core" };
export default async function CartPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const [products, phone] = await Promise.all([
    getShopProducts({ availableOnly: true }),
    getOwnProfilePhone(),
  ]);
  return (
    <PageShell width="md" className="gap-4 pb-8">
      <h1 className="text-pool-deep text-3xl font-extrabold">Tu carrito</h1>
      <ShopNavigation profileId={ctx.ownProfile.id} active="cart" />
      <CartClient
        profileId={ctx.ownProfile.id}
        products={products}
        initialPhone={phone}
        requiresGuardian={requiresGuardianApproval(ctx.ownProfile.birth_year)}
      />
      <ShopContact message="Hola Sol, tengo una duda sobre mi carrito de la tienda de Morvedre Core." />
    </PageShell>
  );
}

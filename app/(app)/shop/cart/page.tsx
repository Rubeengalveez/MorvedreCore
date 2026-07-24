import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";

import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getShopProducts } from "@/server/queries/shop";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { CartClient } from "../_components/cart-client";
import { requiresGuardianApproval } from "@/lib/domain/family";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Carrito — Morvedre Core" };

export default async function CartPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const [products, initialPhone] = await Promise.all([getShopProducts(), getOwnProfilePhone()]);

  return (
    <PageShell width="lg" className="gap-4 pb-8">
      <PageBackLink href="/shop">Seguir comprando</PageBackLink>
      <PageHeader
        eyebrow="Tienda Morvedre"
        title="Revisa tu solicitud"
        description="Cada producto conserva su talla y personalización. Enviar la solicitud no realiza ningún pago."
        icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
      />
      <CartClient
        profileId={ctx.ownProfile.id}
        products={products}
        initialPhone={initialPhone}
        requiresGuardian={requiresGuardianApproval(ctx.ownProfile.birth_year)}
      />
    </PageShell>
  );
}

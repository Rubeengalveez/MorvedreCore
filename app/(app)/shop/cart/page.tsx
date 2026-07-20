import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProducts } from "@/server/queries/shop";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";
import { CartClient } from "../_components/cart-client";
import { requiresGuardianApproval } from "@/lib/domain/family";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Carrito — Morvedre Core" };

export default async function CartPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const supabase = await createClient();
  const [products, { data: ownProfile }] = await Promise.all([
    getShopProducts(),
    supabase
      .from("profiles")
      .select("phone_e164, birth_year")
      .eq("id", ctx.ownProfile.id)
      .maybeSingle(),
  ]);

  return (
    <PageShell width="lg" className="gap-5 pb-8">
      <Link
        href={"/shop" as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Seguir comprando
      </Link>
      <PageHeader
        eyebrow="Tienda Morvedre"
        title="Revisa tu solicitud"
        description="Cada producto conserva su talla y personalización. Enviar la solicitud no realiza ningún pago."
        icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
      />
      <CartClient
        products={products}
        initialPhone={ownProfile?.phone_e164 ?? null}
        requiresGuardian={requiresGuardianApproval(ownProfile?.birth_year ?? null)}
      />
    </PageShell>
  );
}

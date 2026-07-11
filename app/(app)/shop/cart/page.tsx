import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProducts } from "@/server/queries/shop";
import { PageShell } from "@/components/ui/page-shell";
import { CartClient } from "../_components/cart-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Carrito — Morvedre Core" };

export default async function CartPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const products = await getShopProducts({ availableOnly: true });

  return (
    <PageShell width="lg" className="gap-5 pb-8">
      <Link
        href={"/shop" as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Seguir comprando
      </Link>
      <header className="bg-pool-deep text-paper shadow-elev-3 flex items-start justify-between gap-4 rounded-[1.75rem] px-5 py-6 sm:px-7 sm:py-7">
        <div>
          <p className="text-paper/65 text-xs font-extrabold tracking-[0.14em] uppercase">
            Tienda Morvedre
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">Tu carrito</h1>
          <p className="text-paper/75 mt-2 text-base">
            Revisa tallas y personalización antes de enviar.
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
          <ShoppingBag className="h-6 w-6" aria-hidden="true" />
        </span>
      </header>
      <CartClient products={products} myProfileId={ctx.activeProfile.id} />
    </PageShell>
  );
}

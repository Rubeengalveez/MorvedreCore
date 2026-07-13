import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

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
      <header className="border-ink-300 border-b pb-5">
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.14em] uppercase">
          Tienda Morvedre
        </p>
        <h1 className="font-display text-pool-deep mt-1 text-3xl font-extrabold tracking-tight">
          Revisa tu solicitud
        </h1>
        <p className="text-ink-600 mt-2 max-w-xl text-base leading-relaxed">
          Cada producto conserva su talla y personalización. Enviar la solicitud no realiza ningún
          pago.
        </p>
      </header>
      <CartClient products={products} myProfileId={ctx.activeProfile.id} />
    </PageShell>
  );
}

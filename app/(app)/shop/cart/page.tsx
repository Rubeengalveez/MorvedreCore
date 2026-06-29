import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ShoppingCart } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProducts } from "@/server/queries/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CartClient } from "../_components/cart-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Carrito — Morvedre Core",
};

export default async function CartPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const products = await getShopProducts({ availableOnly: true });

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/shop" as Route}
          className="inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Seguir comprando
        </Link>
        <header className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-pool-deep" aria-hidden="true" />
          <div>
            <Eyebrow>Tu carrito</Eyebrow>
            <h1 className="font-display text-2xl font-extrabold text-pool-deep">
              Solicitud de compra
            </h1>
          </div>
        </header>
        <CartClient products={products} myProfileId={ctx.activeProfile.id} />
      </div>
    </div>
  );
}

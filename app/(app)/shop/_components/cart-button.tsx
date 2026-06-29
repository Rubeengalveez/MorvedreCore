"use client";

import { useShopCart } from "@/hooks/use-shop-cart";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

export function CartButton() {
  const cart = useShopCart();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/shop/cart" as Route)}
      data-cart-button
      className="relative inline-flex h-10 w-10 items-center justify-center rounded border border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
      aria-label="Carrito"
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {cart.hydrated && cart.items.length > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-goggle-red px-1 text-[9px] font-extrabold text-paper">
          {cart.items.reduce((acc, i) => acc + i.quantity, 0)}
        </span>
      ) : null}
    </button>
  );
}

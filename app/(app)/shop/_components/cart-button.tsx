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
      className="border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue touch-target relative inline-flex h-11 w-11 items-center justify-center rounded border transition-colors focus-visible:ring-2 focus-visible:outline-none"
      aria-label="Carrito"
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {cart.hydrated && cart.items.length > 0 ? (
        <span className="bg-goggle-red text-paper absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold">
          {cart.items.reduce((acc, i) => acc + i.quantity, 0)}
        </span>
      ) : null}
    </button>
  );
}

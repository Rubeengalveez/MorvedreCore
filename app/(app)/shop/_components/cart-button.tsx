"use client";

import Link from "next/link";
import type { Route } from "next";
import { ShoppingBag } from "lucide-react";

import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils/cn";

export function CartButton({ className }: { className?: string }) {
  const cart = useShopCart();
  const count = cart.hydrated ? cart.items.length : 0;

  return (
    <Link
      href={"/shop/cart" as Route}
      data-cart-button
      className={cn(
        "border-ink-300 bg-paper-card text-pool-deep hover:border-pool-blue focus-visible:ring-pool-blue hover:bg-pool-foam relative inline-flex min-h-12 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold shadow-sm transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none sm:px-4",
        className,
      )}
      aria-label={count > 0 ? `Carrito, ${count} artículos` : "Carrito"}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">Carrito</span>
      {count > 0 ? (
        <span className="bg-ball-gold text-pool-deep inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-extrabold tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

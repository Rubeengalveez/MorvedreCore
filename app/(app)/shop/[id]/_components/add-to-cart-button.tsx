"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils/cn";

export interface AddToCartButtonProps {
  productId: string;
  available: boolean;
  maxPerOrder: number;
  sizes: string[];
}

export function AddToCartButton({
  productId,
  available,
  maxPerOrder,
  sizes,
}: AddToCartButtonProps) {
  const router = useRouter();
  const cart = useShopCart();
  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!available) return null;

  function add() {
    cart.addItem({
      productId,
      size,
      quantity: Math.max(1, Math.min(quantity, maxPerOrder)),
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="border-ink-200 bg-paper flex flex-col gap-3 rounded-md border px-3 py-3">
      {sizes.length > 1 ? (
        <div>
          <ControlLabel>Talla</ControlLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={cn(
                  "touch-target h-11 min-w-11 rounded-md border px-3 text-sm font-extrabold",
                  size === s
                    ? "border-pool-deep bg-pool-deep text-paper"
                    : "border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-3">
        <div>
          <ControlLabel>Cantidad</ControlLabel>
          <div className="border-ink-300 bg-paper-card mt-2 inline-flex h-11 items-center overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="text-ink-700 touch-target flex h-11 w-11 items-center justify-center"
              aria-label="Quitar uno"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-pool-deep w-11 text-center font-mono text-lg font-extrabold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxPerOrder, q + 1))}
              className="text-ink-700 touch-target flex h-11 w-11 items-center justify-center"
              aria-label="Anadir uno"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <span className="text-ink-600 pb-2 text-xs font-bold">max {maxPerOrder}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button type="button" variant="primary" size="lg" onClick={add} className="min-w-0">
          <ShoppingCart className="h-4 w-4" />
          {added ? "Anadido" : "Anadir"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.push("/shop/cart" as never)}
          className="px-3"
        >
          Carrito
        </Button>
      </div>
    </div>
  );
}

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink-600 text-xs font-extrabold tracking-[0.08em] uppercase">
      {children}
    </span>
  );
}

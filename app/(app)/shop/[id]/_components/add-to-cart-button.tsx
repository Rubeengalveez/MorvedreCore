"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";

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
      size: size,
      quantity: Math.max(1, Math.min(quantity, maxPerOrder)),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-3">
      {sizes.length > 1 ? (
        <div>
          <EyebrowLabel>Talla</EyebrowLabel>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={
                  "h-9 min-w-9 rounded-full border px-3 text-xs font-bold " +
                  (size === s
                    ? "border-pool-deep bg-pool-deep text-paper"
                    : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <EyebrowLabel>Cantidad</EyebrowLabel>
        <div className="mt-1 inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded border border-ink-300 text-ink-700"
            aria-label="Quitar uno"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-mono text-base font-bold text-pool-deep">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxPerOrder, q + 1))}
            className="flex h-9 w-9 items-center justify-center rounded border border-ink-300 text-ink-700"
            aria-label="Añadir uno"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="text-[10px] text-ink-600">máx {maxPerOrder}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={add}
          className="flex-1"
        >
          <ShoppingCart className="h-4 w-4" />
          {added ? "Añadido" : "Añadir al carrito"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.push("/shop/cart" as never)}
        >
          Ver carrito
        </Button>
      </div>
    </div>
  );
}

function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
      {children}
    </span>
  );
}

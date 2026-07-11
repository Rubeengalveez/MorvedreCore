"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check, ChevronRight, PenLine, ShoppingBag } from "lucide-react";

import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils/cn";

export interface AddToCartButtonProps {
  productId: string;
  available: boolean;
  sizes: string[];
  personalizationEnabled: boolean;
  personalizationLabel: string;
  personalizationMaxLength: number;
}

export function AddToCartButton({
  productId,
  available,
  sizes,
  personalizationEnabled,
  personalizationLabel,
  personalizationMaxLength,
}: AddToCartButtonProps) {
  const cart = useShopCart();
  const [size, setSize] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (!available) return null;

  function add() {
    setError(null);
    if (sizes.length > 0 && !size) {
      setError("Elige una talla antes de añadir el producto.");
      return;
    }
    const normalizedPersonalization = personalization.trim();
    if (personalizationEnabled && !normalizedPersonalization) {
      setError(`Escribe ${personalizationLabel.toLocaleLowerCase("es-ES")} antes de continuar.`);
      return;
    }
    cart.addItem({
      productId,
      size,
      personalization: personalizationEnabled ? normalizedPersonalization : null,
      quantity: 1,
    });
    setAdded(true);
  }

  return (
    <section aria-labelledby="product-options-heading" className="flex flex-col gap-5">
      <div>
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
          Configura tu producto
        </p>
        <h2 id="product-options-heading" className="font-display text-pool-deep mt-1 text-xl font-extrabold">
          Elige antes de añadir
        </h2>
      </div>

      {sizes.length > 0 ? (
        <fieldset>
          <div className="flex items-center justify-between gap-3">
            <legend className="text-pool-deep text-base font-extrabold">Talla</legend>
            <span className="text-ink-500 text-sm">Obligatoria</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {sizes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSize(item);
                  setError(null);
                }}
                aria-pressed={size === item}
                className={cn(
                  "focus-visible:ring-pool-blue min-h-12 touch-manipulation rounded-lg border px-3 text-base font-extrabold transition-[background-color,border-color,color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
                  size === item
                    ? "border-pool-deep bg-pool-deep text-paper"
                    : "border-ink-300 bg-paper text-pool-deep hover:border-pool-blue",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="border-ink-300 flex min-h-12 items-center justify-between border-y py-3 text-sm">
          <span className="text-ink-600">Talla</span>
          <span className="text-pool-deep font-extrabold">Única</span>
        </div>
      )}

      {personalizationEnabled ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="product-personalization" className="text-pool-deep text-base font-extrabold">
              {personalizationLabel}
            </label>
            <span className="text-ink-500 text-sm tabular-nums">
              {personalization.length}/{personalizationMaxLength}
            </span>
          </div>
          <div className="relative mt-3">
            <PenLine className="text-ink-400 pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" aria-hidden="true" />
            <input
              id="product-personalization"
              name="personalization"
              value={personalization}
              onChange={(event) => {
                setPersonalization(event.target.value);
                setError(null);
              }}
              maxLength={personalizationMaxLength}
              autoComplete="off"
              placeholder={`Escribe ${personalizationLabel.toLocaleLowerCase("es-ES")}`}
              className="border-ink-300 bg-paper text-pool-deep placeholder:text-ink-400 focus-visible:ring-pool-blue min-h-13 w-full rounded-lg border pr-4 pl-12 text-base font-semibold outline-none focus-visible:ring-2"
              required
            />
          </div>
          <p className="text-ink-600 mt-2 text-sm">Se guardará exactamente como lo escribas.</p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="bg-goggle-red/5 text-goggle-red rounded-lg px-3 py-2.5 text-sm font-semibold">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={add}
          className={cn(
            "focus-visible:ring-pool-blue inline-flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-lg px-5 text-base font-extrabold transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
            added ? "bg-success text-paper" : "bg-action hover:bg-action-dark text-paper",
          )}
          aria-live="polite"
        >
          {added ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingBag className="h-5 w-5" aria-hidden="true" />}
          {added ? "Añadido" : "Añadir al carrito"}
        </button>
        <Link
          href={"/shop/cart" as Route}
          className="border-ink-300 text-pool-deep hover:border-pool-blue focus-visible:ring-pool-blue bg-paper inline-flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-lg border px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Ver carrito
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

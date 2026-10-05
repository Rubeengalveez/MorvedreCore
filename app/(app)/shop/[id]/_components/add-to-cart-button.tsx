"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check, ChevronRight, PenLine, ShoppingBag } from "lucide-react";

import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils/cn";

export interface AddToCartButtonProps {
  profileId: string;
  productId: string;
  available: boolean;
  sizes: string[];
  personalizationEnabled: boolean;
  personalizationLabel: string;
  personalizationMaxLength: number;
}

export function AddToCartButton({
  profileId,
  productId,
  available,
  sizes,
  personalizationEnabled,
  personalizationLabel,
  personalizationMaxLength,
}: AddToCartButtonProps) {
  const cart = useShopCart(profileId);
  const addedRef = useRef(false);
  const [size, setSize] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (!available) return null;

  function add() {
    if (addedRef.current || !cart.hydrated) return;
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
    const saved = cart.addItem({
      productId,
      size,
      personalization: personalizationEnabled ? normalizedPersonalization : null,
      quantity: 1,
    });
    addedRef.current = saved;
    setAdded(saved);
  }

  return (
    <section aria-label="Opciones del producto" className="flex flex-col gap-5">
      {sizes.length > 0 ? (
        <fieldset>
          <legend className="text-pool-deep text-base font-extrabold">Talla · obligatoria</legend>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {sizes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSize(item);
                  setError(null);
                  setAdded(false);
                  addedRef.current = false;
                }}
                aria-pressed={size === item}
                className={cn(
                  "focus-visible:ring-pool-blue min-h-12 touch-manipulation rounded-lg border px-3 text-base font-extrabold transition-[background-color,border-color,color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
                  size === item
                    ? "border-pool-deep bg-pool-deep text-paper"
                    : "border-pool-deep/65 bg-paper text-pool-deep hover:border-pool-blue",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="bg-paper-card flex min-h-12 items-center justify-between rounded-xl px-3 py-2 text-sm">
          <span className="text-ink-600 font-semibold">Talla</span>
          <span className="text-pool-deep font-extrabold">Única</span>
        </div>
      )}

      {personalizationEnabled ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="product-personalization"
              className="text-pool-deep text-base font-extrabold"
            >
              {personalizationLabel}
            </label>
            <span className="text-ink-500 text-sm tabular-nums">
              {personalization.length}/{personalizationMaxLength}
            </span>
          </div>
          <div className="relative mt-3">
            <PenLine
              className="text-pool-blue pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="product-personalization"
              name="personalization"
              value={personalization}
              onChange={(event) => {
                setPersonalization(event.target.value);
                setError(null);
                setAdded(false);
                addedRef.current = false;
              }}
              maxLength={personalizationMaxLength}
              autoComplete="off"
              placeholder={`Ejemplo: ${personalizationLabel.toLocaleLowerCase("es-ES")}…`}
              aria-invalid={Boolean(error && !personalization.trim())}
              aria-describedby={
                error ? "product-options-error personalization-advice" : "personalization-advice"
              }
              className="border-ink-300 bg-paper text-pool-deep placeholder:text-ink-500 focus-visible:ring-pool-blue min-h-13 w-full rounded-lg border pr-4 pl-12 text-base font-semibold outline-none focus-visible:ring-2"
              required
            />
          </div>
          <p
            id="personalization-advice"
            className="border-pool-deep/65 bg-pool-foam text-pool-deep mt-3 rounded-lg border p-3 text-sm font-semibold"
          >
            Usa un nombre corto: solo el nombre, iniciales o un nombre y un apellido. Así cabrá
            mejor en el producto.
          </p>
        </div>
      ) : null}

      {error || cart.error ? (
        <p
          role="alert"
          id="product-options-error"
          className="border-goggle-red/35 bg-goggle-red/5 text-goggle-red rounded-lg border px-3 py-2.5 text-sm font-semibold"
        >
          {error || cart.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={add}
          disabled={added || !cart.hydrated}
          className={cn(
            "focus-visible:ring-pool-blue inline-flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-lg px-5 text-base font-extrabold transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
            added
              ? "border-2 border-emerald-900 bg-emerald-100 text-emerald-950"
              : "bg-pool-deep hover:bg-pool-blue text-paper",
          )}
        >
          {added ? (
            <span className="motion-safe:animate-[scale-up_250ms_ease-out]">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : (
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          )}
          {added ? "Añadido al carrito" : "Añadir al carrito"}
        </button>
        <Link
          href={"/shop/cart" as Route}
          className="border-pool-deep/65 text-pool-deep hover:border-pool-blue focus-visible:ring-pool-blue inline-flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-lg border-2 bg-blue-50 px-4 text-base font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Ver carrito
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {added ? (
          <div className="text-pool-deep border-pool-deep/65 flex items-center gap-3 rounded-xl border-2 bg-blue-50 p-3 motion-safe:animate-[slide-y_250ms_ease-out]">
            <span className="bg-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white">
              <Check className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-extrabold">Ya está en tu carrito</p>
              <p className="text-sm font-semibold">Confirma el pedido desde el carrito.</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm font-semibold text-slate-700">
            Todavía no has hecho el pedido. Confírmalo desde el carrito.
          </p>
        )}
      </div>
    </section>
  );
}

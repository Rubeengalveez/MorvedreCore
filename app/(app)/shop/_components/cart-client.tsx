"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Check, PackageOpen, Send, ShoppingBag, Trash2 } from "lucide-react";

import { useShopCart } from "@/hooks/use-shop-cart";
import { formatCents, summarizeCart } from "@/lib/domain/shop";
import type { ShopProduct } from "@/server/queries/shop";
import { createShopOrder } from "@/server/actions/admin/shop";

export interface CartClientProps {
  products: ShopProduct[];
  myProfileId?: string;
}

export function CartClient({ products }: CartClientProps) {
  const router = useRouter();
  const cart = useShopCart();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const cartSummary = summarizeCart(
    cart.items.map((item) => ({
      product_id: item.productId,
      size: item.size,
      personalization: item.personalization,
      quantity: 1,
    })),
    products,
  );
  const productById = new Map(products.map((product) => [product.id, product]));

  function handleCheckout() {
    setError(null);
    if (!cartSummary.ok) {
      setError(cartSummary.error ?? "Revisa los productos del carrito.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createShopOrder({
          items: cartSummary.lines!.map((line) => ({
            product_id: line.product_id,
            size: line.size,
            personalization: line.personalization,
            quantity: 1,
          })),
          notes: notes.trim() || null,
        });
        cart.clear();
        setSuccess(true);
        window.setTimeout(() => router.push(`/shop/orders/${result.id}` as never), 1200);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No hemos podido enviar la solicitud.");
      }
    });
  }

  if (success) {
    return (
      <div
        role="status"
        className="border-success/25 bg-success/10 flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border px-6 text-center"
      >
        <span className="bg-success text-paper flex h-14 w-14 items-center justify-center rounded-2xl">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="font-display text-pool-deep mt-4 text-2xl font-extrabold">
          Solicitud enviada
        </h2>
        <p className="text-ink-600 mt-2 max-w-sm text-base leading-relaxed">
          Te llevamos al seguimiento del pedido…
        </p>
      </div>
    );
  }

  if (!cart.hydrated) {
    return (
      <div
        role="status"
        className="border-ink-200 bg-paper-card text-ink-600 min-h-40 animate-pulse rounded-2xl border p-6 text-center text-base motion-reduce:animate-none"
      >
        Cargando carrito…
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="border-ink-200 bg-paper-card flex min-h-72 flex-col items-center justify-center rounded-[1.75rem] border border-dashed px-6 text-center">
        <span className="bg-pool-foam text-pool-deep flex h-14 w-14 items-center justify-center rounded-2xl">
          <ShoppingBag className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="font-display text-pool-deep mt-4 text-2xl font-extrabold">
          Tu carrito está vacío
        </h2>
        <p className="text-ink-600 mt-2 max-w-sm text-base leading-relaxed">
          Elige una prenda o producto para preparar tu solicitud.
        </p>
        <Link
          href={"/shop" as Route}
          className="bg-pool-deep text-paper focus-visible:ring-pool-blue mt-5 inline-flex min-h-12 items-center rounded-xl px-5 text-base font-extrabold focus-visible:ring-2 focus-visible:outline-none"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="cart-products-heading">
          <div className="mb-3 flex items-end justify-between px-1">
            <h2
              id="cart-products-heading"
              className="font-display text-pool-deep text-xl font-extrabold"
            >
              Productos elegidos
            </h2>
            <span className="text-ink-500 text-sm font-semibold tabular-nums">
              {cart.items.length}
            </span>
          </div>
          <ul className="border-ink-300 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-xl border shadow-sm">
            {cart.items.map((item) => {
              const product = productById.get(item.productId);
              if (!product) {
                return (
                  <li
                    key={`${item.productId}-${item.size ?? ""}-${item.personalization ?? ""}`}
                    className="grid min-h-24 grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-pool-deep font-extrabold">Producto retirado</p>
                      <p className="text-ink-600 mt-1 text-sm leading-relaxed">
                        Ya no forma parte del catálogo. Puedes quitarlo para continuar con tu
                        solicitud.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        cart.removeItem(
                          item.productId,
                          item.size ?? null,
                          item.personalization ?? null,
                        )
                      }
                      className="border-ink-200 text-goggle-red hover:bg-goggle-red/5 focus-visible:ring-goggle-red flex h-12 w-12 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      aria-label="Eliminar producto retirado"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </li>
                );
              }
              return (
                <li
                  key={`${item.productId}-${item.size ?? ""}-${item.personalization ?? ""}`}
                  className="grid min-h-28 grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-3 px-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto_3rem] sm:px-4"
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.title}
                      width={80}
                      height={96}
                      className="border-ink-200 h-20 w-18 shrink-0 rounded-lg border object-cover sm:h-24 sm:w-20"
                    />
                  ) : (
                    <span className="bg-pool-foam text-pool-deep flex h-20 w-18 shrink-0 items-center justify-center rounded-lg sm:h-24 sm:w-20">
                      <PackageOpen className="h-7 w-7" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-pool-deep line-clamp-2 text-base leading-snug font-extrabold">
                      {product.title}
                    </p>
                    {!product.available ? (
                      <p className="text-goggle-red mt-1 text-xs font-extrabold">
                        Retirado temporalmente
                      </p>
                    ) : null}
                    <p className="text-ink-500 mt-1 text-sm">
                      {item.size ? `Talla ${item.size}` : "Talla única"}
                    </p>
                    {item.personalization ? (
                      <p className="text-pool-blue mt-1 text-sm font-extrabold">
                        {product.personalization_label}: {item.personalization}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-pool-deep col-start-2 font-mono text-lg font-extrabold tabular-nums sm:col-auto">
                    {formatCents(product.price_cents, product.currency)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      cart.removeItem(
                        item.productId,
                        item.size ?? null,
                        item.personalization ?? null,
                      )
                    }
                    className="border-ink-200 text-goggle-red hover:bg-goggle-red/5 focus-visible:ring-goggle-red flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    aria-label={`Eliminar ${product.title}`}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-labelledby="cart-notes-heading"
          className="border-ink-200 bg-paper-card rounded-2xl border p-4 shadow-sm"
        >
          <h2
            id="cart-notes-heading"
            className="font-display text-pool-deep text-lg font-extrabold"
          >
            Indicaciones del pedido
          </h2>
          <label
            htmlFor="shop-order-notes"
            className="text-ink-600 mt-1 block text-sm leading-relaxed"
          >
            Opcional. Úsalo solo si necesitas aclarar algo a la encargada.
          </label>
          <textarea
            id="shop-order-notes"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            autoComplete="off"
            rows={3}
            placeholder="Escribe una indicación general…"
            className="border-ink-200 bg-paper text-pool-deep placeholder:text-ink-400 focus-visible:ring-pool-blue mt-3 w-full resize-y rounded-xl border p-3 text-base outline-none focus-visible:ring-2"
          />
        </section>
      </div>

      <aside className="border-pool-deep bg-pool-deep text-paper shadow-elev-2 rounded-xl border p-5 md:sticky md:top-[calc(var(--top-bar-height)+1rem)]">
        <p className="text-paper/65 text-xs font-extrabold tracking-[0.12em] uppercase">Resumen</p>
        {cartSummary.ok ? (
          <>
            <div className="mt-3 flex items-end justify-between gap-4">
              <span className="text-paper/80 text-base font-semibold">Total</span>
              <span className="text-paper font-mono text-3xl font-extrabold tabular-nums">
                {formatCents(cartSummary.total_cents!, "EUR")}
              </span>
            </div>
            <p className="text-paper/70 mt-3 text-sm leading-relaxed">
              {cart.items.length} {cart.items.length === 1 ? "producto" : "productos"}. Se guardará
              en Mis pedidos y la encargada recibirá el aviso.
            </p>
          </>
        ) : (
          <p role="alert" className="text-paper mt-3 text-sm font-semibold">
            {cartSummary.error}
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="bg-paper/10 text-paper mt-3 rounded-lg px-3 py-2 text-sm font-semibold"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={pending || !cartSummary.ok}
          onClick={handleCheckout}
          className="bg-action hover:bg-action-dark text-paper focus-visible:ring-paper mt-5 inline-flex min-h-13 w-full touch-manipulation items-center justify-center gap-2 rounded-lg px-4 text-base font-extrabold transition-[background-color,transform,opacity] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
          {pending ? "Enviando…" : "Enviar solicitud"}
        </button>
      </aside>
    </div>
  );
}

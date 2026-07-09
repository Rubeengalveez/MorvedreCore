"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Minus, Plus, Trash2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CapTile } from "@/components/ui/cap-tile";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Tienda } from "@/components/brand/pictograms";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const cartSummary = summarizeCart(
    cart.items.map((i) => ({
      product_id: i.productId,
      size: i.size,
      quantity: i.quantity,
    })),
    products,
  );
  const productById = new Map(products.map((p) => [p.id, p]));

  function handleCheckout() {
    setError(null);
    if (!cartSummary.ok) {
      setError(cartSummary.error ?? "Carrito inválido.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createShopOrder({
          items: cartSummary.lines!.map((l) => ({
            product_id: l.product_id,
            size: l.size,
            quantity: l.quantity,
          })),
        });
        cart.clear();
        setSuccess(true);
        setTimeout(() => router.push(`/shop/orders/${res.id}` as never), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  if (success) {
    return (
      <div className="border-success/30 bg-success/10 rounded-md border p-6 text-center">
        <Check className="text-success mx-auto h-8 w-8" aria-hidden="true" />
        <h2 className="font-display text-pool-deep mt-2 text-lg font-extrabold">
          Solicitud enviada
        </h2>
        <p className="text-ink-600 mt-1 text-sm">
          Tu padre/madre recibirá una notificación para aprobarla.
        </p>
      </div>
    );
  }

  if (!cart.hydrated) {
    return (
      <div className="border-ink-300 bg-paper-card text-ink-600 rounded-md border p-6 text-center text-sm">
        Cargando carrito…
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="border-ink-300 bg-paper-card rounded-md border border-dashed p-6 text-center">
        <PictogramBadge pictogram={Tienda} color="var(--pool-deep)" size="lg" />
        <p className="font-display text-pool-deep mt-3 text-base font-extrabold">
          Tu carrito está vacío
        </p>
        <p className="text-ink-600 mt-1 text-sm">
          Ve a la tienda y añade productos para crear una solicitud de compra.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>Tus productos</Eyebrow>
      <ul className="flex flex-col gap-2">
        {cart.items.map((item) => {
          const product = productById.get(item.productId);
          if (!product) return null;
          const subtotal = product.price_cents * item.quantity;
          return (
            <li
              key={`${item.productId}-${item.size ?? ""}`}
              className="border-ink-300 bg-paper-card shadow-elev-1 flex items-center gap-3 rounded-md border p-3"
            >
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-16 w-16 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="bg-pool-foam flex h-16 w-16 shrink-0 items-center justify-center rounded">
                  <CapTile number={1} teamColor="var(--pool-deep)" size="sm" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-pool-deep line-clamp-1 font-bold">{product.title}</p>
                <p className="text-ink-600 text-[10px]">
                  {item.size ? `Talla ${item.size} · ` : ""}
                  {formatCents(product.price_cents, product.currency)} ud.
                </p>
                <div className="mt-1 inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      cart.setQuantity(item.productId, item.size ?? null, item.quantity - 1)
                    }
                    className="border-ink-300 text-ink-700 touch-target flex h-10 w-10 items-center justify-center rounded border"
                    aria-label="Quitar uno"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      cart.setQuantity(item.productId, item.size ?? null, item.quantity + 1)
                    }
                    className="border-ink-300 text-ink-700 touch-target flex h-10 w-10 items-center justify-center rounded border"
                    aria-label="Añadir uno"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-pool-deep font-mono text-sm font-extrabold">
                  {formatCents(subtotal, product.currency)}
                </p>
                <button
                  type="button"
                  onClick={() => cart.removeItem(item.productId, item.size ?? null)}
                  className="border-ink-300 bg-paper text-goggle-red hover:bg-goggle-red/5 touch-target mt-1 inline-flex h-10 items-center gap-1 rounded border px-3 text-xs font-bold tracking-wider uppercase"
                  aria-label="Eliminar del carrito"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {cartSummary.ok ? (
        <div className="border-pool-deep bg-pool-deep/5 shadow-elev-1 rounded-md border-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-ink-700 text-xs font-bold tracking-wider uppercase">Total</span>
            <span className="text-pool-deep font-mono text-2xl font-extrabold">
              {formatCents(cartSummary.total_cents!, "EUR")}
            </span>
          </div>
          <p className="text-ink-600 mt-1 text-[11px]">
            {cartSummary.item_count} artículo{cartSummary.item_count === 1 ? "" : "s"} · se enviará
            a tu padre/madre para aprobación
          </p>
        </div>
      ) : (
        <div className="border-ink-300 bg-paper-card text-ink-600 rounded-md border p-3 text-xs">
          {cartSummary.error}
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="border-goggle-red/30 bg-goggle-red/5 text-goggle-red rounded-md border px-3 py-2 text-xs font-bold"
        >
          {error}
        </div>
      ) : null}

      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={pending || !cartSummary.ok}
        onClick={handleCheckout}
        className="w-full"
      >
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Enviando…" : "Solicitar a mi padre/madre"}
      </Button>
    </div>
  );
}

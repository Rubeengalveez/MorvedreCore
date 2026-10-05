"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Check, Minus, PackageOpen, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useShopCart } from "@/hooks/use-shop-cart";
import { summarizeCart } from "@/lib/domain/shop";
import { shopMoney } from "@/lib/domain/shop-management";
import type { ShopProduct } from "@/server/queries/shop";
import { createShopOrder } from "@/server/actions/admin/shop";
import { normalizeSpanishPhone } from "@/lib/domain/phone";
import { ShopDecisionSheet } from "@/components/shop/shop-decision-sheet";
import { shopControl, shopPrimary, shopSecondary, ShopError } from "@/components/shop/shop-ui";
export interface CartClientProps {
  profileId: string;
  products: ShopProduct[];
  initialPhone: string | null;
  requiresGuardian: boolean;
}
export function CartClient({
  profileId,
  products,
  initialPhone,
  requiresGuardian,
}: CartClientProps) {
  const router = useRouter(),
    cart = useShopCart(profileId);
  const [notes, setNotes] = useState(""),
    [phone, setPhone] = useState(initialPhone ?? ""),
    [error, setError] = useState<string | null>(null),
    [confirmation, setConfirmation] = useState(false),
    [success, setSuccess] = useState<{ id: string; order_reference: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const summary = summarizeCart(
    cart.items.map((item) => ({
      product_id: item.productId,
      size: item.size,
      personalization: item.personalization,
      quantity: item.quantity,
    })),
    products,
  );
  const byId = new Map(products.map((product) => [product.id, product]));
  function submit() {
    if (submitting.current || !summary.ok) return;
    const contact = normalizeSpanishPhone(phone);
    if (!requiresGuardian && !contact) {
      setError("Escribe un teléfono válido para que Sol pueda contactar contigo.");
      return;
    }
    if (!navigator.onLine) {
      setError(
        "Ahora no tienes conexión. Tu carrito sigue guardado; confirma el pedido cuando vuelva la conexión.",
      );
      return;
    }
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      let requestStarted = false;
      try {
        const items = summary.lines!.map((line) => ({
          product_id: line.product_id,
          size: line.size,
          personalization: line.personalization,
          quantity: line.quantity,
        }));
        const key = cart.checkoutKey(
          JSON.stringify({ items, total: summary.total_cents, notes: notes.trim() }),
        );
        requestStarted = true;
        const result = await createShopOrder({
          checkout_key: key,
          expected_total_cents: summary.total_cents!,
          items,
          notes: notes.trim() || null,
          contact_phone: requiresGuardian ? null : contact,
        });
        cart.clear();
        setSuccess(result);
        setConfirmation(false);
        router.refresh();
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No pudimos confirmar el pedido. Tu carrito sigue guardado.";
        setError(
          message.startsWith("El precio ha cambiado")
            ? "El precio ha cambiado. Revisa el nuevo total antes de confirmar."
            : message.startsWith("Un producto ya no está disponible")
              ? "Un producto ya no está disponible. Vuelve al carrito para quitarlo."
              : message,
        );
        if (requestStarted) router.refresh();
      } finally {
        submitting.current = false;
      }
    });
  }
  if (success)
    return (
      <section
        role="status"
        className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white"
      >
        <div className="bg-pool-deep flex items-center gap-3 p-4 text-white">
          <Check className="h-7 w-7" aria-hidden="true" />
          <h2 className="text-2xl font-extrabold">
            {requiresGuardian ? "Enviado a tu familia" : "Pedido confirmado"}
          </h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-lg font-extrabold">Pedido {success.order_reference}</p>
          <p>
            {requiresGuardian
              ? "Tu familia debe aprobarlo antes de que llegue a Sol."
              : "Sol ya tiene el pedido. Puedes seguir su estado en Mis pedidos."}
          </p>
          <Link href={`/shop/orders/${success.id}` as Route} className={`${shopPrimary} w-full`}>
            Ver mi pedido
          </Link>
          <Link href="/shop" className={`${shopSecondary} w-full`}>
            Volver a productos
          </Link>
        </div>
      </section>
    );
  if (!cart.hydrated)
    return (
      <div
        role="status"
        className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-6 text-center font-bold"
      >
        Preparando tu carrito…
      </div>
    );
  if (!cart.items.length)
    return (
      <section className="border-pool-deep/65 text-pool-deep space-y-4 rounded-2xl border-2 bg-white px-5 py-8 text-center">
        <ShoppingBag className="mx-auto h-12 w-12" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold">Tu carrito está vacío</h2>
        <p>Elige tus productos y aparecerán aquí.</p>
        <Link href="/shop" className={shopPrimary}>
          Ver productos
        </Link>
      </section>
    );
  return (
    <>
      <ol
        aria-label="Pasos del pedido"
        className="text-pool-deep grid grid-cols-3 gap-2 text-sm font-bold"
      >
        {["Elige", "Revisa", "Confirma"].map((label, i) => (
          <li
            key={label}
            aria-current={i === 1 ? "step" : undefined}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`border-pool-deep/65 grid h-8 w-8 place-items-center rounded-full border ${i === 1 ? "bg-pool-deep text-white" : "bg-white"}`}
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {cart.error ? <ShopError>{cart.error}</ShopError> : null}
      <section aria-labelledby="cart-products">
        <h2 id="cart-products" className="text-pool-deep mb-3 text-xl font-extrabold">
          Tus productos
        </h2>
        <ul className="space-y-3">
          {cart.items.map((item) => {
            const product = byId.get(item.productId);
            const available = product?.available;
            return (
              <li
                key={JSON.stringify([item.productId, item.size, item.personalization])}
                className="border-pool-deep/65 text-pool-deep space-y-3 rounded-2xl border-2 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                    {product?.image_url ? (
                      <Image
                        src={product.image_url}
                        width={80}
                        height={80}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <PackageOpen className="h-7 w-7" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop/${item.productId}` as Route}
                      className="block text-base leading-snug font-extrabold [overflow-wrap:anywhere]"
                    >
                      {product?.title ?? "Producto retirado"}
                    </Link>
                    {item.size ? (
                      <p className="mt-1 text-sm font-semibold">Talla {item.size}</p>
                    ) : null}
                    {item.personalization ? (
                      <p className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">
                        Nombre: {item.personalization}
                      </p>
                    ) : null}
                    {product ? (
                      <p className="mt-1 text-lg font-extrabold tabular-nums">
                        {shopMoney(product.price_cents * item.quantity)}
                        {item.quantity > 1 ? (
                          <span className="ml-2 text-sm font-semibold text-slate-600">
                            {shopMoney(product.price_cents)}/ud.
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </div>
                {!available ? (
                  <ShopError>
                    Este producto ya no está disponible. Quítalo para continuar.
                  </ShopError>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {available ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={pending || item.quantity <= 1}
                        aria-label={`Una unidad menos de ${product.title}`}
                        className={`${shopSecondary} h-12 w-12 p-0 disabled:opacity-40`}
                        onClick={() => cart.setQuantity(item, item.quantity - 1)}
                      >
                        <Minus className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center font-extrabold tabular-nums">
                        <span aria-hidden="true">{item.quantity}</span>
                        <span className="sr-only">
                          {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={pending}
                        aria-label={`Una unidad más de ${product.title}`}
                        className={`${shopSecondary} h-12 w-12 p-0`}
                        onClick={() => cart.setQuantity(item, item.quantity + 1)}
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => cart.removeItem(item.productId, item.size, item.personalization)}
                    className={`${shopSecondary} border-red-800 bg-red-50 text-red-900`}
                    aria-label={`Quitar ${product?.title ?? "producto retirado"}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <details className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-4">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 font-extrabold">
          Añadir una indicación para Sol
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
        </summary>
        <label htmlFor="shop-order-notes" className="mt-3 block text-base font-semibold">
          Indicaciones para Sol (opcional)
        </label>
        <textarea
          id="shop-order-notes"
          rows={2}
          maxLength={500}
          disabled={pending}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="¿Necesitas aclarar algo del pedido?"
          className={`${shopControl} resize-y py-3`}
        />
      </details>
      <section className="border-pool-deep/65 text-pool-deep space-y-4 rounded-2xl border-2 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Total del pedido</h2>
          <strong className="text-2xl whitespace-nowrap tabular-nums">
            {summary.ok ? shopMoney(summary.total_cents!) : "—"}
          </strong>
        </div>
        <div className="border-pool-deep/65 rounded-xl border bg-blue-50 p-3">
          <p className="font-extrabold">Sin pago ahora</p>
          <p className="mt-1 text-sm font-semibold">
            {requiresGuardian
              ? "Tu familia lo revisará antes de que llegue a Sol."
              : "El importe se incluirá en el cierre mensual del club."}
          </p>
        </div>
        {!summary.ok ? (
          <ShopError>
            {summary.error}
            <button
              type="button"
              onClick={() => router.refresh()}
              className={`${shopSecondary} mt-3 w-full`}
            >
              Actualizar carrito
            </button>
          </ShopError>
        ) : null}
        <button
          type="button"
          disabled={pending || !summary.ok}
          className={`${shopPrimary} w-full`}
          onClick={() => {
            setError(null);
            setConfirmation(true);
          }}
        >
          Revisar y confirmar pedido
        </button>
        <Link href="/shop" className={`${shopSecondary} w-full`}>
          Añadir más productos
        </Link>
      </section>
      <ShopDecisionSheet
        open={confirmation}
        onOpenChange={setConfirmation}
        title={requiresGuardian ? "¿Enviar a tu familia?" : "¿Confirmar este pedido?"}
        icon="saved"
        pending={pending}
        error={error}
        tall
        stickyActions
        description="Revisa el total y confirma el pedido. No se realiza ningún pago en la aplicación."
        body={
          <div className="text-pool-deep space-y-4">
            <div className="border-pool-deep/65 rounded-xl border-2 bg-white p-4">
              <p className="text-sm font-bold">
                {summary.item_count} {summary.item_count === 1 ? "unidad" : "unidades"}
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-lg font-extrabold">Total</span>
                <strong className="text-2xl tabular-nums">
                  {summary.ok ? shopMoney(summary.total_cents!) : "—"}
                </strong>
              </div>
            </div>
            <p className="border-pool-deep/65 rounded-xl border bg-blue-50 p-3 text-base font-semibold">
              {requiresGuardian
                ? "Tu familia lo aprobará antes de enviarlo a Sol."
                : "No pagas ahora. Se incluirá en el cierre mensual del club."}
            </p>
            {!requiresGuardian ? (
              <div className="space-y-2">
                <label htmlFor="shop-contact-phone" className="block font-extrabold">
                  Teléfono para Sol
                </label>
                <input
                  id="shop-contact-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={pending}
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError(null);
                  }}
                  placeholder="612 345 678"
                  aria-invalid={Boolean(error && !normalizeSpanishPhone(phone))}
                  className={shopControl}
                />
              </div>
            ) : null}
          </div>
        }
        actions={[
          {
            label: requiresGuardian ? "Enviar a mi familia" : "Confirmar pedido",
            tone: "primary",
            disabled: !summary.ok,
            onClick: submit,
          },
          { label: "Volver al carrito", tone: "secondary", onClick: () => setConfirmation(false) },
        ]}
      />
    </>
  );
}

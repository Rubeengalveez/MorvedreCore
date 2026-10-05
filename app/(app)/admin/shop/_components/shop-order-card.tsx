"use client";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Phone, Undo2 } from "lucide-react";
import { SHOP_ORDER_STATUS_LABELS } from "@/lib/domain/shop";
import { isActiveShopOrder, shopMoney, type ManagedShopOrder } from "@/lib/domain/shop-management";
import { updateShopOrderStatus } from "@/server/actions/admin/shop";
import { ShopDecisionSheet } from "./shop-decision-sheet";
import { ShopPersonName } from "./shop-person-name";
import { shopPrimary, shopSecondary } from "./shop-ui";

export function ShopOrderCard({
  order,
  selecting = false,
  selected = false,
  onSelect,
  historyHref,
  showStatus = false,
  readonly = false,
}: {
  order: ManagedShopOrder;
  selecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  historyHref?: string;
  showStatus?: boolean;
  readonly?: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"deliver" | "undo" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const delivered = order.status === "delivered";
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: showStatus ? "numeric" : undefined,
    timeZone: "Europe/Madrid",
  }).format(new Date(order.requested_at));
  const phone = order.contact_phone_e164 ?? order.guardian_phone;
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const multiple = order.items.length > 1;
  function save() {
    if (!confirm) return;
    startTransition(async () => {
      try {
        await updateShopOrderStatus({
          order_id: order.id,
          status: confirm === "deliver" ? "delivered" : "pending_admin",
        });
        setConfirm(null);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos guardar el cambio.");
      }
    });
  }
  function rememberList() {
    try {
      sessionStorage.setItem(
        `shop-scroll:${window.location.pathname}${window.location.search}`,
        String(window.scrollY),
      );
    } catch {}
  }
  const person = (
    <>
      <ShopPersonName
        name={order.requested_by_name ?? "Nombre no disponible"}
        className="text-lg font-extrabold"
      />
      {order.category_label && (
        <span className="border-pool-deep/65 bg-pool-foam shrink-0 rounded-lg border px-2 py-1 text-sm font-bold whitespace-nowrap">
          {order.category_label}
        </span>
      )}
    </>
  );
  return (
    <article
      role={selecting ? "checkbox" : undefined}
      aria-checked={selecting ? selected : undefined}
      tabIndex={selecting ? 0 : undefined}
      aria-label={
        selecting
          ? `Incluir pedido ${order.order_reference} de ${order.requested_by_name} en PDF`
          : `Pedido de ${order.requested_by_name ?? "socio"}`
      }
      onKeyDown={
        selecting
          ? (event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a,button")) return;
        if (selecting) onSelect?.();
        else if (historyHref) {
          rememberList();
          router.push(historyHref as Route);
        }
      }}
      className={`overflow-hidden rounded-2xl border-2 ${selected ? "border-pool-blue ring-pool-blue bg-blue-50 ring-2" : "border-pool-deep/70 bg-white"} ${selecting || historyHref ? "cursor-pointer" : ""} focus-visible:outline-pool-blue focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      <div className="bg-pool-foam flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold">
        <span>Pedido {order.order_reference}</span>
        <span className="shrink-0">{date}</span>
      </div>
      <div className="space-y-4 p-4">
        {selecting && (
          <div className="text-pool-blue flex items-center gap-2 font-bold" aria-hidden="true">
            <span
              className={`border-pool-deep flex h-7 w-7 items-center justify-center rounded-md border-2 ${selected ? "bg-pool-deep text-white" : "bg-white"}`}
            >
              {selected && <Check className="h-5 w-5" />}
            </span>
            {selected ? "Incluido en el PDF" : "Toca para incluir"}
          </div>
        )}
        <h2>
          {historyHref && !selecting ? (
            <Link
              href={historyHref as Route}
              className="focus-visible:outline-pool-blue flex min-h-12 items-center gap-2 rounded-lg focus-visible:outline-2"
              onClick={rememberList}
              aria-label={`Ver historial de ${order.requested_by_name}`}
            >
              {person}
            </Link>
          ) : (
            <span className="flex items-center gap-2">{person}</span>
          )}
        </h2>
        {showStatus && (
          <span
            className={`border-pool-deep inline-flex rounded-lg border-2 px-3 py-1 text-sm font-bold ${delivered ? "bg-emerald-100 text-emerald-950" : "text-pool-deep bg-amber-100"}`}
          >
            {delivered
              ? "Entregado"
              : isActiveShopOrder(order)
                ? "Activo"
                : SHOP_ORDER_STATUS_LABELS[order.status]}
          </span>
        )}
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="border-pool-deep/45 flex items-center gap-3 rounded-xl border bg-slate-50 p-3"
            >
              <span className="bg-pool-deep flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1 font-extrabold text-white">
                {item.quantity}×
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold break-words">{item.product_title ?? "Producto"}</p>
                {item.size && <p className="mt-0.5 text-sm font-semibold">Talla: {item.size}</p>}
                {item.personalization && (
                  <p className="mt-0.5 text-sm break-words">
                    Nombre: <strong>{item.personalization}</strong>
                  </p>
                )}
                {multiple && (
                  <div className="border-pool-deep/40 mt-2 flex flex-wrap items-center justify-between gap-1 rounded-lg border bg-white px-2 py-1 text-sm">
                    <span>
                      {item.quantity > 1
                        ? `${shopMoney(item.unit_price_cents)} / unidad`
                        : "Precio"}
                    </span>
                    <strong>{shopMoney(item.subtotal_cents)}</strong>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        {(order.notes || order.parent_notes) && (
          <div className="border-pool-deep/60 rounded-xl border bg-amber-50 p-3">
            <p className="font-bold">Nota del pedido</p>
            {[order.notes, order.parent_notes].filter(Boolean).map((note, index) => (
              <p key={index} className="mt-1 break-words whitespace-pre-wrap">
                {note}
              </p>
            ))}
          </div>
        )}
        {order.approved_by_name && (
          <p className="text-sm">
            <strong>Familia:</strong> {order.approved_by_name}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {selecting ? (
            <span className="font-semibold">Total del pedido</span>
          ) : phone ? (
            <a className={shopSecondary} href={`tel:${phone}`}>
              <Phone aria-hidden="true" className="h-4 w-4" />
              {phone}
            </a>
          ) : (
            <span className="text-sm font-semibold">Sin teléfono</span>
          )}
          <span className="text-lg font-extrabold">{shopMoney(order.total_cents)}</span>
        </div>
        {!selecting && !readonly && (
          <button
            type="button"
            className={`${delivered ? shopSecondary : shopPrimary} w-full`}
            onClick={() => {
              setError(null);
              setConfirm(delivered ? "undo" : "deliver");
            }}
          >
            {delivered ? (
              <Undo2 aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Check aria-hidden="true" className="h-5 w-5" />
            )}
            {delivered ? "Volver a pendientes" : "Marcar entregado"}
          </button>
        )}
      </div>
      <ShopDecisionSheet
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "deliver" ? "¿Has entregado este pedido?" : "¿Volver a pendientes?"}
        summary={order.requested_by_name ?? "Este socio"}
        description={`${units} ${units === 1 ? "unidad" : "unidades"}. ${confirm === "deliver" ? "Pasará al histórico y dejará de salir en el PDF." : "Volverá a aparecer en la lista y en el PDF de pendientes."}`}
        icon="saved"
        pending={pending}
        error={error}
        actions={[
          {
            label: confirm === "deliver" ? "Sí, ya está entregado" : "Volver a pendientes",
            tone: "primary",
            onClick: save,
          },
          { label: "Volver", tone: "secondary", onClick: () => setConfirm(null) },
        ]}
      />
    </article>
  );
}

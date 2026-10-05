import Image from "next/image";
import { PackageOpen } from "lucide-react";
import type { ShopOrder } from "@/server/queries/shop";
import { shopMoney } from "@/lib/domain/shop-management";
export function ShopOrderItems({ order }: { order: ShopOrder }) {
  return (
    <ul className="space-y-3">
      {order.items.map((item) => (
        <li
          key={item.id}
          className="border-pool-deep/65 text-pool-deep flex items-center gap-3 rounded-xl border bg-white p-3"
        >
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
            {item.product_image_url ? (
              <Image
                src={item.product_image_url}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-contain"
              />
            ) : (
              <PackageOpen className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base leading-snug font-extrabold [overflow-wrap:anywhere]">
              {item.product_title ?? "Producto"}
            </span>
            {item.size ? (
              <span className="mt-1 block text-sm font-semibold">Talla {item.size}</span>
            ) : null}
            {item.personalization ? (
              <span className="mt-1 block text-sm font-semibold [overflow-wrap:anywhere]">
                Nombre: {item.personalization}
              </span>
            ) : null}
            <span className="mt-1 block text-sm font-semibold">
              {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"} ·{" "}
              {shopMoney(item.unit_price_cents)}/ud.
            </span>
            <strong className="mt-1 block text-lg tabular-nums">
              {shopMoney(item.subtotal_cents)}
            </strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

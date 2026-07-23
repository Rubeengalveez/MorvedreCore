import { Minus, ShoppingBag, UsersRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import type { FamilyTreasury } from "@/server/queries/treasury";

interface FamilyTreasuryViewProps {
  data: FamilyTreasury;
}

export function FamilyTreasuryView({ data }: FamilyTreasuryViewProps) {
  const {
    currentPeriod,
    children,
    monthlyFeeTotalCents,
    siblingDiscountCents,
    discountedFeesCents,
    shopOrdersTotalCents,
    shopOrders,
  } = data;

  const hasDiscount = siblingDiscountCents < 0;
  const hasShopOrders = shopOrders.length > 0;
  const monthlyTotalCents = discountedFeesCents + shopOrdersTotalCents;
  const periodLabel = currentPeriod?.label ?? "este mes";
  const discountPercent =
    monthlyFeeTotalCents > 0 ? Math.round((-siblingDiscountCents / monthlyFeeTotalCents) * 100) : 0;

  return (
    <section
      aria-labelledby="family-treasury-title"
      className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
    >
      <div className="bg-pool-deep text-paper px-5 py-6 text-center">
        <p className="text-paper/75 text-xs font-extrabold tracking-[0.12em] uppercase">
          Cuota de {periodLabel.toLowerCase()}
        </p>
        <h2
          id="family-treasury-title"
          className="font-mono text-5xl font-extrabold tabular-nums sm:text-6xl"
        >
          {formatTreasuryCents(monthlyTotalCents)}
        </h2>
        <p className="text-paper/80 mt-1 text-sm font-semibold">
          Esto es lo que te cobrará el club este mes.
        </p>
      </div>

      <div className="border-ink-200 border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <UsersRound className="text-pool-blue h-4 w-4" aria-hidden="true" />
          <h3 className="text-pool-deep text-sm font-extrabold">Cuotas de tus hijos</h3>
        </div>
      </div>

      <ul className="divide-ink-200 divide-y">
        {children.map((child) => (
          <li
            key={child.profile_id}
            className="flex min-h-[56px] items-center gap-3 px-4 py-3"
          >
            <Avatar
              name={child.profile_name}
              src={child.photo_url}
              size={40}
              teamColor={child.team_color ?? "var(--pool-blue)"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-pool-deep truncate text-sm font-bold">{child.profile_name}</p>
              {child.team_label ? (
                <p className="text-ink-600 text-xs font-semibold">{child.team_label}</p>
              ) : null}
            </div>
            <span className="text-pool-deep font-mono text-base font-extrabold tabular-nums">
              {formatTreasuryCents(child.monthly_fee_cents)}
            </span>
          </li>
        ))}

        {hasDiscount ? (
          <li className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Minus className="text-success h-4 w-4" aria-hidden="true" />
              <span className="text-ink-700 text-sm font-semibold">
                Descuento hermanos ({discountPercent}%)
              </span>
            </div>
            <span className="text-success font-mono text-base font-extrabold tabular-nums">
              {formatTreasuryCents(siblingDiscountCents)}
            </span>
          </li>
        ) : null}
      </ul>

      <div className="bg-pool-foam/40 border-ink-200 flex min-h-[52px] items-center justify-between gap-3 border-y px-4 py-3">
        <span className="text-pool-deep text-sm font-extrabold">Cuotas tras descuento</span>
        <span className="text-pool-deep font-mono text-lg font-extrabold tabular-nums">
          {formatTreasuryCents(discountedFeesCents)}
        </span>
      </div>

      {hasShopOrders ? (
        <>
          <div className="border-ink-200 border-b px-4 py-3.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-action h-4 w-4" aria-hidden="true" />
              <h3 className="text-pool-deep text-sm font-extrabold">Pedido de tienda confirmado</h3>
            </div>
          </div>
          <ul className="divide-ink-200 divide-y">
            {shopOrders.map((order) => (
              <li
                key={order.id}
                className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-ink-700 text-sm font-semibold">{order.description}</span>
                <span className="text-pool-deep font-mono text-base font-extrabold tabular-nums">
                  {formatTreasuryCents(order.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="bg-paper-sunk flex min-h-[56px] items-center justify-between gap-3 px-4 py-3">
        <span className="text-pool-deep text-base font-extrabold">Total a pagar</span>
        <span className="text-pool-deep font-mono text-2xl font-extrabold tabular-nums">
          {formatTreasuryCents(monthlyTotalCents)}
        </span>
      </div>
    </section>
  );
}

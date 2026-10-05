import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ShopSection } from "@/components/shop/shop-ui";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import type { FamilyTreasury } from "@/server/queries/treasury";

export function FamilyTreasuryView({
  data,
  isParent,
}: {
  data: FamilyTreasury;
  isParent: boolean;
}) {
  const total = data.discountedFeesCents + data.shopOrdersTotalCents;
  return (
    <>
      <section
        aria-label="Resumen de cuotas y pedidos"
        className="border-pool-deep overflow-hidden rounded-2xl border-2 bg-white"
      >
        <div className="bg-pool-deep px-5 py-4 text-white">
          <h2 className="text-lg font-extrabold">Tu resumen</h2>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="font-semibold">Total previsto</span>
            <strong className="font-mono text-3xl font-extrabold tabular-nums">
              {formatTreasuryCents(total)}
            </strong>
          </div>
        </div>
        <p className="text-pool-deep px-4 py-3 font-semibold">
          No pagas desde la app. El club gestiona el cierre mensual.
        </p>
      </section>
      <ShopSection title={isParent ? "Cuotas de tu familia" : "Tu cuota"}>
        {data.currentPeriod && (
          <p className="border-pool-deep/65 text-pool-deep mb-3 rounded-lg border bg-blue-50 px-3 py-2 text-sm font-semibold">
            Último cierre: {data.currentPeriod.label}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {data.children.map((child) => (
            <li
              key={child.profile_id}
              className="border-pool-deep/65 flex items-center gap-3 rounded-xl border bg-blue-50/70 p-3"
            >
              <Avatar
                name={child.profile_name}
                src={child.photo_url}
                size={40}
                teamColor={child.team_color ?? undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="text-pool-deep font-extrabold">
                  <AdaptivePlayerName name={child.profile_name} />
                </p>
                {child.team_label && (
                  <p className="text-pool-deep text-sm font-medium">{child.team_label}</p>
                )}
              </div>
              <strong className="text-pool-deep shrink-0 font-mono font-extrabold tabular-nums">
                {formatTreasuryCents(child.monthly_fee_cents)}
              </strong>
            </li>
          ))}
        </ul>
        {data.siblingDiscountCents < 0 && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-green-800 bg-green-50 p-3 font-bold text-green-900">
            <span>Descuento de hermanos</span>
            <span className="shrink-0 tabular-nums">
              {formatTreasuryCents(data.siblingDiscountCents)}
            </span>
          </div>
        )}
        <div className="border-pool-deep/65 text-pool-deep mt-3 flex items-center justify-between gap-3 rounded-xl border-2 bg-blue-50 p-3 font-extrabold">
          <span>Total de cuotas</span>
          <span className="shrink-0 tabular-nums">
            {formatTreasuryCents(data.discountedFeesCents)}
          </span>
        </div>
      </ShopSection>
      <ShopSection title="Pedidos de tienda">
        {data.shopOrders.length ? (
          <ul className="flex flex-col gap-2">
            {data.shopOrders.map((order) => (
              <li
                key={order.id}
                className="border-pool-deep/65 text-pool-deep flex items-center justify-between gap-3 rounded-xl border bg-blue-50/70 p-3"
              >
                <span className="font-semibold">{order.description}</span>
                <strong className="shrink-0 tabular-nums">
                  {formatTreasuryCents(order.amount_cents)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-pool-deep font-medium">Sin pedidos incluidos en este mes.</p>
        )}
        <div className="border-pool-deep/65 text-pool-deep mt-3 flex items-center justify-between gap-3 rounded-xl border-2 bg-blue-50 p-3 font-extrabold">
          <span>Total de tienda</span>
          <span className="shrink-0 tabular-nums">
            {formatTreasuryCents(data.shopOrdersTotalCents)}
          </span>
        </div>
      </ShopSection>
    </>
  );
}

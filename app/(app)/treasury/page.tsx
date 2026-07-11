import { redirect } from "next/navigation";
import { Banknote, CheckCircle2 } from "lucide-react";

import { AppPageHero } from "@/components/ui/app-page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell, SectionHeader } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getFamilyTreasury } from "@/server/queries/treasury";
import { formatTreasuryCents } from "@/lib/domain/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tesoreria - Morvedre Core",
};

export default async function TreasuryPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const data = await getFamilyTreasury(ctx.activeProfile.id);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <AppPageHero
        eyebrow="Tesorería"
        title="Este mes"
        description="Tus importes pendientes del club."
        icon={<Banknote className="h-6 w-6" aria-hidden="true" />}
      />

      <section className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-5">
        <p className="text-ink-600 text-xs font-extrabold tracking-[0.08em] uppercase">Pendiente</p>
        <p className="text-pool-deep mt-1 font-mono text-3xl font-extrabold">
          {formatTreasuryCents(data.totalPendingCents)}
        </p>
        <p className="text-ink-600 mt-2 text-sm leading-relaxed font-semibold">
          La tesorera marca el pago cuando lo concilia por Bizum, transferencia o efectivo.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader title="Detalle" />
        {data.lines.length > 0 ? (
          <ul className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 flex flex-col divide-y rounded-2xl border p-3">
            {data.lines.map((line) => (
              <li key={line.id} className="flex min-h-14 items-center gap-3 py-2">
                <span className="bg-pool-foam text-pool-blue flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Banknote className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">
                    {line.description}
                  </p>
                  <p className="text-ink-600 line-clamp-1 text-xs font-semibold">
                    {line.profile_name}
                  </p>
                </div>
                <span className="text-pool-deep font-mono text-sm font-extrabold">
                  {formatTreasuryCents(line.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
            title="No tienes nada pendiente"
            description="Cuando se genere un cierre mensual, aparecerá aquí."
          />
        )}
      </section>
    </PageShell>
  );
}

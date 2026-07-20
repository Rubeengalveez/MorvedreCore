import { redirect } from "next/navigation";
import { Banknote, CheckCircle2, UsersRound } from "lucide-react";

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
  const data = await getFamilyTreasury(ctx.ownProfile.id);
  if (!data.canView) redirect("/profile");

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <AppPageHero
        eyebrow="Tesorería"
        title="Este mes"
        description="Tus cuotas y las de tu familia, separadas por persona."
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

      <section className="flex flex-col gap-3">
        <SectionHeader title={data.groups.length > 1 ? "Por persona" : "Detalle"} />
        {data.groups.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.groups.map((group) => (
              <section
                key={group.profileId}
                aria-labelledby={`treasury-${group.profileId}`}
                className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
              >
                <div className="bg-pool-foam/65 border-ink-200 flex min-h-16 items-center gap-3 border-b px-4 py-3">
                  <span className="bg-paper-card text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
                    <UsersRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={`treasury-${group.profileId}`}
                      className="text-pool-deep truncate font-extrabold"
                    >
                      {group.profileName}
                    </h2>
                    <p className="text-ink-600 text-xs font-semibold">
                      {group.lines.length} {group.lines.length === 1 ? "concepto" : "conceptos"}
                    </p>
                  </div>
                  <strong className="text-pool-deep font-mono text-base tabular-nums">
                    {formatTreasuryCents(group.totalCents)}
                  </strong>
                </div>
                <ul className="divide-ink-200 divide-y px-4">
                  {group.lines.map((line) => (
                    <li key={line.id} className="flex min-h-14 items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-pool-deep text-sm font-bold">{line.description}</p>
                      </div>
                      <span className="text-pool-deep font-mono text-sm font-extrabold tabular-nums">
                        {formatTreasuryCents(line.amount_cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
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

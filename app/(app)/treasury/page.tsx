import { redirect } from "next/navigation";
import { Banknote, CheckCircle2 } from "lucide-react";

import { LanePattern } from "@/components/ui/lane-pattern";
import { PageHeader, PageShell, SectionHeader } from "@/components/ui/page-shell";
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
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell className="gap-3">
        <PageHeader
          eyebrow="Tesoreria"
          title="Este mes"
          description="Tus importes pendientes del club."
          icon={<Banknote className="h-8 w-8" />}
          teamColor="var(--pool-blue)"
        />

        <section className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-ink-600">
            Pendiente
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold text-pool-deep">
            {formatTreasuryCents(data.totalPendingCents)}
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-600">
            La tesorera marca el pago cuando lo concilia por Bizum, transferencia o efectivo.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeader title="Detalle" />
          {data.lines.length > 0 ? (
            <ul className="flex flex-col divide-y divide-ink-200 rounded-md border border-ink-300 bg-paper-card p-2 shadow-elev-1">
              {data.lines.map((line) => (
                <li key={line.id} className="flex min-h-14 items-center gap-3 py-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pool-foam text-pool-blue">
                    <Banknote className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-extrabold text-pool-deep">
                      {line.description}
                    </p>
                    <p className="line-clamp-1 text-xs font-semibold text-ink-600">
                      {line.profile_name}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-extrabold text-pool-deep">
                    {formatTreasuryCents(line.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-md border border-ink-300 bg-paper-card p-6 text-center shadow-elev-1">
              <CheckCircle2 className="h-9 w-9 text-success" />
              <p className="text-sm font-extrabold text-pool-deep">No tienes nada pendiente.</p>
              <p className="text-sm font-semibold leading-relaxed text-ink-600">
                Cuando se genere un cierre mensual, aparecera aqui.
              </p>
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
}

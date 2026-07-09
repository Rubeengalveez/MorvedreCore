import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";

import { LanePattern } from "@/components/ui/lane-pattern";
import { Button } from "@/components/ui/button";
import { PageShell, SectionHeader } from "@/components/ui/page-shell";
import { getTreasuryClosure } from "@/server/queries/treasury";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import { PaidButton } from "../../_components/treasury-forms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Cierre de tesoreria - Morvedre Core",
};

export default async function TreasuryClosurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { closure, lines } = await getTreasuryClosure(id);
  if (!closure) notFound();
  const paidTotal = lines
    .filter((line) => line.paid)
    .reduce((acc, line) => acc + line.amount_cents, 0);
  const pendingTotal = closure.total_cents - paidTotal;

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell width="lg" className="gap-3">
        <Link
          href={"/admin/treasury" as Route}
          className="inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm font-extrabold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Tesoreria
        </Link>

        <header className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-pool-blue">
                Cierre mensual
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold text-pool-deep">
                {closure.period_label}
              </h1>
              <p className="mt-1 text-sm font-semibold text-ink-600">
                {closure.period_start} / {closure.period_end}
              </p>
            </div>
            <FileSpreadsheet className="h-8 w-8 shrink-0 text-pool-blue" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Total" value={formatTreasuryCents(closure.total_cents)} />
            <Stat label="Pagado" value={formatTreasuryCents(paidTotal)} />
            <Stat label="Pendiente" value={formatTreasuryCents(pendingTotal)} />
          </div>
          <Button asChild variant="primary" className="mt-4 w-full">
            <a href={`/api/treasury/closures/${closure.id}/export`}>
              <Download className="h-4 w-4" />
              Descargar Excel
            </a>
          </Button>
        </header>

        <section className="flex flex-col gap-2">
          <SectionHeader title="Lineas del cierre" />
          {lines.length > 0 ? (
            <ul className="flex flex-col divide-y divide-ink-200 rounded-md border border-ink-300 bg-paper-card p-2 shadow-elev-1">
              {lines.map((line) => (
                <li key={line.id} className="flex min-h-14 items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-extrabold text-pool-deep">
                      {line.profile_name}
                    </p>
                    <p className="line-clamp-1 text-xs font-semibold text-ink-600">
                      {line.description}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-extrabold text-pool-deep">
                    {formatTreasuryCents(line.amount_cents)}
                  </span>
                  <PaidButton lineId={line.id} paid={line.paid} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-ink-300 bg-paper p-4 text-sm font-semibold text-ink-600">
              Este cierre no tiene lineas.
            </p>
          )}
        </section>
      </PageShell>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-paper-sunk p-2">
      <p className="truncate text-[0.64rem] font-extrabold uppercase tracking-[0.08em] text-ink-600">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xs font-extrabold text-pool-deep">
        {value}
      </p>
    </div>
  );
}

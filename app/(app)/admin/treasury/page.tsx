import Link from "next/link";
import type { Route } from "next";
import { Banknote, ChevronRight, FileSpreadsheet } from "lucide-react";

import { LanePattern } from "@/components/ui/lane-pattern";
import { PageHeader, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTreasuryDashboard } from "@/server/queries/treasury";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import {
  AssignmentForm,
  ClosureForm,
  ConceptForm,
  LinesPreview,
} from "./_components/treasury-forms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tesoreria - Morvedre Core",
};

export default async function AdminTreasuryPage() {
  const [season, data] = await Promise.all([getCurrentSeason(), getTreasuryDashboard()]);
  const latestClosure = data.closures[0] ?? null;

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell width="lg" className="gap-3">
        <PageHeader
          eyebrow="Fase 6"
          title="Tesoreria"
          description="Conceptos, cierres mensuales y control de pagos."
          icon={<Banknote className="h-8 w-8" />}
          teamColor="var(--pool-blue)"
        />

        <section className="grid grid-cols-3 gap-2">
          <Stat label="Conceptos" value={String(data.concepts.length)} />
          <Stat label="Asignados" value={String(data.assignments.length)} />
          <Stat
            label="Ultimo"
            value={latestClosure ? formatTreasuryCents(latestClosure.total_cents) : "0.00 EUR"}
          />
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <ConceptForm />
          <AssignmentForm concepts={data.concepts} profiles={data.playerOptions} />
          <ClosureForm seasonId={season?.id ?? null} />
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1">
            <SectionHeader title="Conceptos" />
            {data.concepts.length > 0 ? (
              <ul className="mt-2 flex flex-col divide-y divide-ink-200">
                {data.concepts.map((concept) => (
                  <li key={concept.id} className="flex min-h-12 items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-extrabold text-pool-deep">
                        {concept.label}
                      </p>
                      <p className="line-clamp-1 text-xs font-semibold text-ink-600">
                        {concept.code} / {concept.periodicity}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-extrabold text-pool-deep">
                      {concept.default_amount_cents == null
                        ? "Variable"
                        : formatTreasuryCents(concept.default_amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm font-semibold text-ink-600">
                Aun no hay conceptos.
              </p>
            )}
          </div>

          <div className="rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1">
            <SectionHeader title="Cierres" />
            {data.closures.length > 0 ? (
              <ul className="mt-2 flex flex-col divide-y divide-ink-200">
                {data.closures.map((closure) => (
                  <li key={closure.id}>
                    <Link
                      href={`/admin/treasury/closures/${closure.id}` as Route}
                      className="flex min-h-14 items-center gap-2 py-2"
                    >
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-pool-blue" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-extrabold text-pool-deep">
                          {closure.period_label}
                        </p>
                        <p className="line-clamp-1 text-xs font-semibold text-ink-600">
                          {closure.line_count} lineas / {closure.status}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-pool-deep">
                        {formatTreasuryCents(closure.total_cents)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-ink-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm font-semibold text-ink-600">
                Aun no hay cierres generados.
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeader title="Ultimas lineas" />
          <LinesPreview lines={data.latestLines} />
        </section>
      </PageShell>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1">
      <p className="truncate text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-ink-600">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-extrabold text-pool-deep">
        {value}
      </p>
    </div>
  );
}

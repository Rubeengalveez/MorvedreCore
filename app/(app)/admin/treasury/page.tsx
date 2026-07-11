import Link from "next/link";
import type { Route } from "next";
import { Banknote, ChevronRight, FileSpreadsheet } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { SectionHeader } from "@/components/ui/page-shell";
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
    <AdminPageShell width="lg">
      <AdminPageHeader
        eyebrow="Control económico"
        title="Tesoreria"
        description="Conceptos, cierres mensuales y control de pagos."
        icon={<Banknote className="h-6 w-6" aria-hidden="true" />}
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
        <div className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4">
          <SectionHeader title="Conceptos" />
          {data.concepts.length > 0 ? (
            <ul className="divide-ink-200 mt-2 flex flex-col divide-y">
              {data.concepts.map((concept) => (
                <li
                  key={concept.id}
                  className="flex min-h-12 items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">
                      {concept.label}
                    </p>
                    <p className="text-ink-600 line-clamp-1 text-xs font-semibold">
                      {concept.code} / {concept.periodicity}
                    </p>
                  </div>
                  <span className="text-pool-deep shrink-0 font-mono text-xs font-extrabold">
                    {concept.default_amount_cents == null
                      ? "Variable"
                      : formatTreasuryCents(concept.default_amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-600 mt-2 text-sm font-semibold">Aun no hay conceptos.</p>
          )}
        </div>

        <div className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4">
          <SectionHeader title="Cierres" />
          {data.closures.length > 0 ? (
            <ul className="divide-ink-200 mt-2 flex flex-col divide-y">
              {data.closures.map((closure) => (
                <li key={closure.id}>
                  <Link
                    href={`/admin/treasury/closures/${closure.id}` as Route}
                    className="hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue -mx-2 flex min-h-14 items-center gap-2 rounded-xl px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <FileSpreadsheet className="text-pool-blue h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">
                        {closure.period_label}
                      </p>
                      <p className="text-ink-600 line-clamp-1 text-xs font-semibold">
                        {closure.line_count} lineas / {closure.status}
                      </p>
                    </div>
                    <span className="text-pool-deep font-mono text-xs font-extrabold">
                      {formatTreasuryCents(closure.total_cents)}
                    </span>
                    <ChevronRight className="text-ink-400 h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-600 mt-2 text-sm font-semibold">Aun no hay cierres generados.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader title="Ultimas lineas" />
        <LinesPreview lines={data.latestLines} />
      </section>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-ink-200 bg-paper-card shadow-elev-1 min-w-0 rounded-xl border p-3">
      <p className="text-ink-600 truncate text-xs font-extrabold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="text-pool-deep mt-1 truncate font-mono text-sm font-extrabold">{value}</p>
    </div>
  );
}

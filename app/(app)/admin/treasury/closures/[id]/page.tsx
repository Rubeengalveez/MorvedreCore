import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/page-shell";
import { getTreasuryClosure } from "@/server/queries/treasury";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import { formatShortDate } from "@/lib/utils/format";
import { PaidButton, SendClosureEmailButton } from "../../_components/treasury-forms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Cierre de tesoreria - Morvedre Core",
};

export default async function TreasuryClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { closure, lines } = await getTreasuryClosure(id);
  if (!closure) notFound();
  const paidTotal = lines
    .filter((line) => line.paid)
    .reduce((acc, line) => acc + line.amount_cents, 0);
  const pendingTotal = closure.total_cents - paidTotal;

  return (
    <AdminPageShell width="lg">
      <Link
        href={"/admin/treasury" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Tesoreria
      </Link>

      <AdminPageHeader
        eyebrow="Cierre mensual"
        title={closure.period_label}
        description={`${formatShortDate(closure.period_start)} — ${formatShortDate(closure.period_end)}`}
        icon={<FileSpreadsheet className="h-6 w-6" aria-hidden="true" />}
      />
      <section className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4">
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
        <SendClosureEmailButton closureId={closure.id} sentToEmail={closure.sent_to_email} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader title="Lineas del cierre" />
        {lines.length > 0 ? (
          <ul className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 flex flex-col divide-y rounded-2xl border p-3">
            {lines.map((line) => (
              <li key={line.id} className="flex min-h-14 items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">
                    {line.profile_name}
                  </p>
                  <p className="text-ink-600 line-clamp-1 text-xs font-semibold">
                    {line.description}
                  </p>
                </div>
                <span className="text-pool-deep font-mono text-sm font-extrabold">
                  {formatTreasuryCents(line.amount_cents)}
                </span>
                <PaidButton lineId={line.id} paid={line.paid} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FileSpreadsheet className="h-6 w-6" aria-hidden="true" />}
            title="Este cierre está vacío"
            description="No hay líneas asociadas a este periodo."
          />
        )}
      </section>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-sunk min-w-0 rounded-xl p-2.5">
      <p className="text-ink-600 truncate text-xs font-extrabold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="text-pool-deep mt-1 truncate font-mono text-sm font-extrabold">{value}</p>
    </div>
  );
}

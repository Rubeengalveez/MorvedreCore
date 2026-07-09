import Link from "next/link";
import type { Route } from "next";
import { Balon } from "@/components/brand/pictograms";

export interface EmptyStateProps {
  metricLabel: string;
  scopeLabel: string;
  showRegenerateCta?: boolean;
}

export function EmptyState({
  metricLabel,
  scopeLabel,
  showRegenerateCta = false,
}: EmptyStateProps) {
  return (
    <div className="border-ink-300 bg-paper-card flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
      <div className="bg-pool-foam flex h-14 w-14 items-center justify-center rounded-full">
        <Balon className="h-8 w-8" accent="var(--pool-blue)" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-pool-deep text-base font-extrabold">
          Sin datos de {metricLabel.toLowerCase()} en {scopeLabel.toLowerCase()}
        </p>
        <p className="text-ink-600 text-sm">
          Cuando se validen actas, las posiciones se calculan solas.
        </p>
      </div>
      {showRegenerateCta ? (
        <Link
          href={"/admin/matches" as Route}
          className="border-pool-deep bg-pool-deep text-paper shadow-elev-1 hover:bg-ink-900 inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-extrabold transition-colors"
        >
          Ir a partidos
        </Link>
      ) : null}
    </div>
  );
}

import { Balon } from "@/components/brand/pictograms";

export interface EmptyStateProps {
  metricLabel: string;
  scopeLabel: string;
}

export function EmptyState({ metricLabel, scopeLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-ink-300 bg-paper p-8 text-center">
      <Balon className="h-12 w-12" accent="var(--ball-gold)" />
      <p className="font-display text-base font-bold text-pool-deep">
        Todavía no hay datos de {metricLabel.toLowerCase()} en {scopeLabel.toLowerCase()}.
      </p>
      <p className="text-sm text-ink-600">
        El primero en marcar, el primero en liderar.
      </p>
    </div>
  );
}

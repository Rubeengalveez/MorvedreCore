import { Balon } from "@/components/brand/pictograms";

export interface EmptyStateProps {
  metricLabel: string;
  scopeLabel: string;
  metric?: string;
  isSchool?: boolean;
  description?: string;
}

export function EmptyState({
  metricLabel,
  scopeLabel,
  metric = "goals",
  isSchool = false,
  description: customDescription,
}: EmptyStateProps) {
  const isAttendance = metric === "attendance";

  let description = customDescription;
  if (!description) {
    if (isSchool) {
      if (isAttendance) {
        description =
          "Cuando se registre asistencia en los entrenamientos de la Escuela, las posiciones se calculan solas.";
      } else {
        description =
          "La Escuela es formativa y no disputa partidos de competición ni genera actas.";
      }
    } else {
      if (isAttendance) {
        description =
          "Cuando se registre asistencia en los entrenamientos, las posiciones se calculan solas.";
      } else {
        description = "Cuando se validen actas, las posiciones se calculan solas.";
      }
    }
  }

  return (
    <div className="border-ink-300 bg-paper-card flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
      <div className="bg-pool-foam flex h-14 w-14 items-center justify-center rounded-full">
        <Balon className="h-8 w-8" accent="var(--pool-blue)" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-pool-deep text-base font-extrabold">
          Sin datos de {metricLabel.toLowerCase()} en {scopeLabel.toLowerCase()}
        </p>
        <p className="text-ink-600 text-sm">{description}</p>
      </div>
    </div>
  );
}

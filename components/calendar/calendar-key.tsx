import { Ban, Check, Clock3, Minus, UserRoundMinus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const markers = {
  training: {
    label: "Entrenamiento",
    text: "E",
    className: "border-pool-deep bg-pool-blue text-white rounded",
  },
  match: {
    label: "Partido",
    text: "P",
    className: "border-pool-deep bg-ball-gold text-pool-deep rounded-full",
  },
  cancelled: {
    label: "Actividad cancelada",
    Icon: Ban,
    className: "border-slate-600 bg-slate-100 text-slate-800 rounded",
  },
  postponed: {
    label: "Partido aplazado",
    Icon: Clock3,
    className: "border-violet-800 bg-violet-100 text-violet-900 rounded",
  },
  present: {
    label: "Asistió",
    Icon: Check,
    className: "border-green-800 bg-green-100 text-green-900 rounded",
  },
  absent: {
    label: "No asistió",
    Icon: X,
    className: "border-red-800 bg-red-100 text-red-900 rounded",
  },
  mixed: {
    label: "Asistencia parcial",
    Icon: Minus,
    className: "border-violet-800 bg-violet-100 text-violet-950 rounded",
  },
  unreviewed: {
    label: "Sin revisar · asistencia provisional",
    Icon: Clock3,
    className: "border-amber-800 bg-amber-100 text-amber-950 rounded",
  },
  unavailable: {
    label: "Has indicado que no puedes ir",
    Icon: UserRoundMinus,
    className: "border-slate-600 bg-slate-100 text-slate-800 rounded",
  },
} as const;
export type CalendarMarkerKind = keyof typeof markers;
export function CalendarMarker({
  kind,
  compact = false,
}: {
  kind: CalendarMarkerKind;
  compact?: boolean;
}) {
  const marker = markers[kind];
  return (
    <span
      title={marker.label}
      aria-label={marker.label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border leading-none font-black",
        compact ? "h-3.5 w-3.5 text-[10px]" : "h-6 w-6 text-xs",
        marker.className,
      )}
    >
      {"text" in marker ? (
        marker.text
      ) : (
        <marker.Icon
          className={compact ? "h-3 w-3" : "h-4 w-4"}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
export function CalendarKey({ showAttendance }: { showAttendance: boolean }) {
  return (
    <div className="text-pool-deep flex flex-col gap-3">
      <section className="border-pool-deep/65 rounded-xl border-2 bg-white p-3">
        <h3 className="mb-3 font-extrabold">Qué hay ese día</h3>
        <ul className="grid gap-3">
          {(["training", "match", "cancelled", "postponed"] as const).map((kind) => (
            <li className="flex items-center gap-3 text-sm font-semibold" key={kind}>
              <CalendarMarker kind={kind} />
              {markers[kind].label}
            </li>
          ))}
        </ul>
      </section>
      {showAttendance && (
        <section className="border-pool-deep/65 rounded-xl border-2 bg-white p-3">
          <h3 className="mb-3 font-extrabold">¿Fue al entrenamiento?</h3>
          <ul className="grid gap-3">
            {(["present", "absent", "unreviewed", "mixed"] as const).map((kind) => (
              <li className="flex items-center gap-3 text-sm font-semibold" key={kind}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-lg border-2",
                    kind === "present"
                      ? "border-green-800 bg-green-100"
                      : kind === "absent"
                        ? "border-red-800 bg-red-100"
                        : kind === "unreviewed"
                          ? "border-amber-800 bg-amber-100"
                          : "border-violet-800 bg-violet-100",
                  )}
                />
                <span>{markers[kind].label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-blue-50 p-2.5 text-sm leading-snug font-semibold">
            Sin revisar cuenta como asistencia hasta que el entrenador marque una falta. Los
            entrenamientos futuros y cancelados no cuentan.
          </p>
        </section>
      )}
      <section className="border-pool-deep/65 rounded-xl border-2 bg-blue-50 p-3 text-sm leading-snug font-semibold">
        <h3 className="mb-2 font-extrabold">Toca un día para ver los detalles</h3>
        <p>Ahí verás la hora, los equipos, la ubicación y la asistencia de cada persona.</p>
        <p className="mt-2">
          El borde azul marca hoy. El contorno interior marca el día seleccionado. Debajo del
          calendario verás la primera hora y el número de actividades de ese día.
        </p>
        <p className="mt-2">
          En «Toda la familia», un día con asistencias y faltas se muestra en violeta. Abre el día
          para comprobar quién asistió y quién no.
        </p>
      </section>
    </div>
  );
}

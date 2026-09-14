import { Ban, Check, Clock3, Minus, UserRoundMinus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

const markers = {
  training: { label: "Entrenamiento", text: "E", className: "bg-pool-blue text-white rounded-md" },
  match: { label: "Partido", text: "P", className: "bg-ball-gold text-pool-deep rounded-full" },
  cancelled: {
    label: "Actividad cancelada",
    Icon: Ban,
    className: "bg-slate-100 text-slate-700 rounded-md",
  },
  postponed: {
    label: "Partido aplazado",
    Icon: Clock3,
    className: "bg-violet-100 text-violet-800 rounded-md",
  },
  present: {
    label: "Asistió al entrenamiento",
    Icon: Check,
    className: "bg-emerald-100 text-emerald-800 rounded-md",
  },
  absent: {
    label: "Faltó al entrenamiento",
    Icon: X,
    className: "bg-red-100 text-red-800 rounded-md",
  },
  mixed: {
    label: "Asistió solo a parte de los entrenamientos",
    Icon: Minus,
    className: "bg-amber-100 text-amber-900 rounded-md",
  },
  unavailable: {
    label: "Has indicado que no puedes ir",
    Icon: UserRoundMinus,
    className: "bg-slate-100 text-slate-700 rounded-md",
  },
} as const;

export type CalendarMarkerKind = keyof typeof markers;

export function CalendarMarker({ kind, compact = false }: { kind: CalendarMarkerKind; compact?: boolean }) {
  const marker = markers[kind];
  return (
    <span
      title={marker.label}
      aria-label={marker.label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none font-black",
        compact ? "h-3.5 w-3.5 text-[10px]" : "h-5 w-5 text-xs",
        marker.className,
      )}
    >
      {"text" in marker ? (
        marker.text
      ) : (
        <marker.Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} aria-hidden="true" />
      )}
    </span>
  );
}

export function CalendarKey({ showAttendance }: { showAttendance: boolean }) {
  const groups: { title: string; kinds: CalendarMarkerKind[] }[] = [
    {
      title: "Actividades y cambios",
      kinds: ["training", "match", "cancelled", "postponed", "unavailable"],
    },
    ...(showAttendance
      ? [
          {
            title: "Asistencia registrada",
            kinds: ["present", "absent", "mixed"] as CalendarMarkerKind[],
          },
        ]
      : []),
  ];
  return (
    <div className="relative">
    {showAttendance ? <Link href="/attendance/history" className="text-pool-blue focus-visible:ring-pool-blue absolute right-2 top-0 z-10 inline-flex min-h-12 items-center rounded-lg px-2 text-xs font-extrabold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none">Ver asistencia</Link> : null}
    <details
      aria-label="Leyenda del calendario"
      className="border-ink-200 bg-paper-card rounded-xl border px-3 pb-0 open:pb-3"
    >
      <summary className={cn("text-pool-deep min-h-12 cursor-pointer content-center rounded-lg text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-pool-blue", showAttendance && "pr-24")}>Cómo leer el calendario</summary>
      <p className="text-ink-600 mt-1 text-sm">
        Toca un día para ver horarios, equipos y detalles.
      </p>
      {groups.map((group) => (
        <div key={group.title} className="mt-3">
          <h4 className="text-ink-600 mb-2 text-xs font-bold">{group.title}</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.kinds.map((kind) => (
              <li key={kind} className="text-ink-700 flex items-center gap-2 text-sm">
                {kind === "present" || kind === "absent" || kind === "mixed" ? <span aria-hidden="true" className={cn("h-5 w-5 shrink-0 rounded border", kind === "present" ? "border-emerald-300 bg-emerald-100" : kind === "absent" ? "border-red-300 bg-red-100" : "border-amber-300 bg-amber-100")} /> : <CalendarMarker kind={kind} />}
                <span>{markers[kind].label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-ink-600 border-ink-200 mt-3 border-t pt-3 text-xs">
        El borde azul marca hoy y el contorno interior, el día seleccionado. El color de fondo indica la asistencia registrada; sin color, no hay registro. Un día puede tener varias actividades.
      </p>
    </details>
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { Check, ChevronRight, Clock3, UsersRound } from "lucide-react";
import { trainingKindLabel } from "@/lib/domain/training-management";
import { formatTimeOfDay } from "@/lib/domain/calendar";
import type { DashboardCoachSession } from "@/server/queries/dashboard";

export function AttendanceSessionCard({
  session,
  href,
  future,
}: {
  session: DashboardCoachSession;
  href: string;
  future: boolean;
}) {
  const complete = session.roster_count > 0 && session.unmarked_count === 0;
  const started = session.unmarked_count < session.roster_count;
  const empty = session.roster_count === 0;
  const action = future
    ? "Ver plantilla"
    : empty
      ? "Ver entrenamiento"
      : complete
        ? "Revisar lista"
        : "Pasar lista";
  return (
    <Link
      href={href as Route}
      className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue block overflow-hidden rounded-2xl border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="bg-pool-deep flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-white"
            style={{ backgroundColor: session.team_color }}
            aria-hidden="true"
          />
          <span className="text-lg leading-6 font-extrabold">{session.team_label}</span>
        </span>
        <span className="text-ball-gold flex shrink-0 items-center gap-1.5 text-lg font-extrabold tabular-nums">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {formatTimeOfDay(session.scheduled_at)}
        </span>
      </span>
      <span className="flex flex-col gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <UsersRound className="h-4 w-4 shrink-0" aria-hidden="true" />
          {session.roster_count} jugadores
          <span className="border-pool-deep/65 ml-auto rounded-lg border bg-blue-50 px-2 py-0.5 text-xs font-bold">
            {trainingKindLabel(session.kind ?? "water")}
          </span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-extrabold ${future || empty ? "border-slate-600 bg-slate-100 text-slate-800" : complete ? "border-green-800 bg-green-50 text-green-900" : "border-amber-800 bg-amber-50 text-amber-950"}`}
          >
            {complete && !future && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {future
              ? "Solo consulta"
              : empty
                ? "Sin jugadores"
                : complete
                  ? "Lista guardada"
                  : started
                    ? "Por completar"
                    : "Sin pasar lista"}
          </span>
          <span className="text-pool-blue inline-flex items-center gap-1 text-sm font-extrabold whitespace-nowrap">
            {action}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </span>
        </span>
        {complete && !future && (
          <span className="text-sm font-semibold">
            {session.present_count} han venido · {session.absent_count} han faltado
          </span>
        )}
      </span>
    </Link>
  );
}

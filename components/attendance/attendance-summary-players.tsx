"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { AttendanceHistoryCalendar } from "./attendance-history-calendar";
import {
  summarizeAttendance,
  type AttendancePlayerReport,
  type AttendanceTeamReport,
} from "@/lib/domain/attendance-history";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import { normalizeSearchTerm } from "@/lib/domain/swim-times";

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export function AttendanceSummaryPlayers({
  reports,
  initialMonth,
  calendarMonths,
}: {
  reports: AttendanceTeamReport[];
  initialMonth: string;
  calendarMonths: string[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    player: AttendancePlayerReport;
    report: AttendanceTeamReport;
  } | null>(null);
  const [month, setMonth] = useState(initialMonth);
  const term = normalizeSearchTerm(search);
  const visible = reports
    .map((report) => ({
      ...report,
      players: report.players.filter((player) =>
        normalizeSearchTerm(`${player.full_name} ${report.label}`).includes(term),
      ),
    }))
    .filter((report) => report.players.length > 0);
  const count = new Set(visible.flatMap((report) => report.players.map((player) => player.id)))
    .size;
  const records =
    selected?.player.records.filter((record) =>
      getAttendanceDayKey(record.scheduled_at).startsWith(month),
    ) ?? [];
  const summary = summarizeAttendance(records);
  const [year, monthNumber] = month.split("-").map(Number);
  const monthIndex = calendarMonths.indexOf(month);
  return (
    <div className="grid gap-4">
      <div className="border-pool-deep/65 text-pool-deep focus-within:ring-pool-blue flex min-h-12 items-center gap-2 rounded-xl border-2 bg-white px-3 focus-within:ring-2">
        <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar jugador"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar jugador"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setSearch("")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p
        role="status"
        className="border-pool-deep/65 text-pool-deep w-max rounded-lg border bg-white px-2 py-1 text-sm font-bold"
      >
        {count} {count === 1 ? "jugador" : "jugadores"}
      </p>
      {visible.map((report) => (
        <section
          key={report.id}
          aria-labelledby={`attendance-team-${report.id}`}
          className="grid gap-2.5"
        >
          <header className="bg-pool-deep border-pool-deep flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 px-3 text-white">
            <h2 id={`attendance-team-${report.id}`} className="min-w-0 text-base font-extrabold">
              <AdaptivePlayerName name={report.label} />
            </h2>
            <span className="shrink-0 text-xs font-semibold">
              {report.reviewed_session_count}/{report.session_count} revisadas
            </span>
          </header>
          <ul className="grid gap-2.5">
            {report.players.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMonth(initialMonth);
                    setSelected({ player, report });
                  }}
                  aria-label={`${player.full_name}: ${player.attended} asistencias, ${player.absent} faltas, ${player.unreviewed} sin revisar. Ver calendario`}
                  className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue grid min-h-24 w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-xl border-2 border-l-[5px] bg-white p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ borderLeftColor: report.color }}
                >
                  <Avatar
                    src={player.photo_url}
                    name={player.full_name}
                    size={44}
                    teamColor={report.color}
                    style={{ backgroundColor: "#eff6ff", color: "#0A2E5C" }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-5 font-extrabold">
                      <AdaptivePlayerName name={player.full_name} />
                    </span>
                    {player.total > 0 ? (
                      <span className="mt-1 flex items-center gap-2 text-sm leading-5 font-bold">
                        <span className="whitespace-nowrap text-green-900">
                          {player.attended} asist.
                        </span>
                        <span className="whitespace-nowrap text-red-900">
                          {player.absent} {player.absent === 1 ? "falta" : "faltas"}
                        </span>
                      </span>
                    ) : (
                      <span className="mt-1 block text-xs font-semibold">Sin entrenamientos</span>
                    )}
                    {player.unreviewed > 0 && (
                      <span className="mt-1 inline-flex rounded-md border border-amber-800 bg-amber-50 px-1.5 py-0.5 text-[11px] leading-3 font-bold text-amber-950">
                        {player.unreviewed} sin revisar
                      </span>
                    )}
                  </span>
                  <span className="bg-pool-deep inline-flex min-w-14 flex-nowrap items-center justify-center gap-1 self-stretch rounded-lg px-2 text-white">
                    <strong className="shrink-0 text-xl font-extrabold whitespace-nowrap tabular-nums">
                      {player.percentage == null ? "—" : `${player.percentage}%`}
                    </strong>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!visible.length && (
        <p className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-5 text-center font-semibold">
          {search
            ? "No encontramos ese jugador. Prueba con su nombre o apellido."
            : "No hay jugadores en este periodo."}
        </p>
      )}
      <ActaGuardSheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        context={selected?.report.label ?? "Asistencia"}
        title={selected?.player.full_name ?? "Calendario de asistencia"}
        description="Calendario mensual de asistencias, faltas y entrenamientos sin revisar."
        icon="saved"
        tall
        actions={[]}
        body={
          selected && (
            <div className="grid gap-2.5">
              <div
                className={
                  calendarMonths.length > 1
                    ? "grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2"
                    : "text-center"
                }
              >
                {calendarMonths.length > 1 && (
                  <button
                    type="button"
                    aria-label="Mes anterior del periodo"
                    disabled={monthIndex <= 0}
                    onClick={() => setMonth(calendarMonths[monthIndex - 1]!)}
                    className="border-pool-deep/65 text-pool-deep h-12 rounded-xl border-2 bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="mx-auto h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <h2 className="text-pool-deep text-base font-extrabold capitalize">
                  {monthFormatter.format(new Date(`${month}-01T12:00:00Z`))}
                </h2>
                {calendarMonths.length > 1 && (
                  <button
                    type="button"
                    aria-label="Mes siguiente del periodo"
                    disabled={monthIndex >= calendarMonths.length - 1}
                    onClick={() => setMonth(calendarMonths[monthIndex + 1]!)}
                    className="border-pool-deep/65 text-pool-deep h-12 rounded-xl border-2 bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="mx-auto h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                {[
                  {
                    value: summary.attended,
                    label: "Asistencias",
                    tone: "border-green-800 bg-green-50 text-green-900",
                  },
                  {
                    value: summary.absent,
                    label: "Faltas",
                    tone: "border-red-800 bg-red-50 text-red-900",
                  },
                  {
                    value: summary.unreviewed,
                    label: "Sin revisar",
                    tone: "border-amber-800 bg-amber-50 text-amber-950",
                  },
                ].map((item) => (
                  <div key={item.label} className={`${item.tone} rounded-xl border p-2`}>
                    <strong className="block text-xl font-extrabold tabular-nums">
                      {item.value}
                    </strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <AttendanceHistoryCalendar
                key={month}
                year={year!}
                month={monthNumber! - 1}
                records={records}
                profiles={[selected.player]}
                inlineDetail
              />
              <p className="text-pool-deep text-xs font-semibold">
                Sin revisar cuenta como asistencia provisional.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}

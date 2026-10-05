"use client";

import { useState } from "react";
import { Check, Clock3, X } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import type { AttendanceHistoryRecord } from "@/lib/domain/attendance-history";
import { compactMonthCells } from "@/lib/domain/calendar-presentation";
import { formatLongDate, formatTimeOfDay, weekdayShort } from "@/lib/domain/calendar";
import { cn } from "@/lib/utils/cn";

type DayStatus = "present" | "absent" | "mixed" | "unreviewed";
interface AttendanceProfile {
  id: string;
  full_name: string;
}
const tones = {
  present: "border-green-800 bg-green-50 text-green-900",
  absent: "border-red-800 bg-red-50 text-red-900",
  unreviewed: "border-amber-800 bg-amber-50 text-amber-950",
  mixed: "border-violet-800 bg-violet-50 text-violet-900",
};
function getDayStatus(records: AttendanceHistoryRecord[]): DayStatus | null {
  if (!records.length) return null;
  const attended = records.filter((record) => record.present).length;
  if (attended > 0 && attended < records.length) return "mixed";
  if (records.some((record) => record.unreviewed)) return "unreviewed";
  return attended === records.length ? "present" : "absent";
}
const labels = {
  present: "asistió",
  absent: "no asistió",
  mixed: "asistencia parcial",
  unreviewed: "sin revisar, cuenta como asistencia provisional",
};

function DayDetail({
  records,
  profiles,
}: {
  records: AttendanceHistoryRecord[];
  profiles: AttendanceProfile[];
}) {
  return records.length ? (
    <ul className="grid gap-2">
      {records.map((record) => (
        <li
          key={`${record.session_id}/${record.player_id}`}
          className={cn(
            "rounded-xl border-2 p-3",
            tones[record.unreviewed ? "unreviewed" : record.present ? "present" : "absent"],
          )}
        >
          {profiles.length > 1 && (
            <p className="font-extrabold">
              {profiles.find((profile) => profile.id === record.player_id)?.full_name ?? "Jugador"}
            </p>
          )}
          <p className="text-sm font-semibold">
            {record.team_label} · {formatTimeOfDay(record.scheduled_at)}
          </p>
          <p className="mt-1 flex items-center gap-2 font-extrabold">
            {record.unreviewed ? (
              <Clock3 className="h-4 w-4" aria-hidden="true" />
            ) : record.present ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <X className="h-4 w-4" aria-hidden="true" />
            )}
            {record.unreviewed ? "Sin revisar" : record.present ? "Asistió" : "No asistió"}
          </p>
          {record.unreviewed && (
            <p className="mt-1 text-sm font-semibold">
              Cuenta como asistencia hasta que se revise.
            </p>
          )}
          {!record.present && record.reason && (
            <p className="mt-1 text-sm font-semibold">{record.reason}</p>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-3 font-semibold">
      No hay entrenamientos para este día.
    </p>
  );
}

export function AttendanceHistoryCalendar({
  year,
  month,
  records,
  profiles,
  inlineDetail = false,
}: {
  year: number;
  month: number;
  records: AttendanceHistoryRecord[];
  profiles: AttendanceProfile[];
  inlineDetail?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const byDay = new Map<string, AttendanceHistoryRecord[]>();
  for (const record of records) {
    const day = getAttendanceDayKey(record.scheduled_at);
    byDay.set(day, [...(byDay.get(day) ?? []), record]);
  }
  const selectedRecords = byDay.get(selected ?? "") ?? [];
  const mixed = [...byDay.values()].some((entries) => getDayStatus(entries) === "mixed");
  return (
    <div className="flex flex-col gap-3">
      <div className="border-pool-deep/65 rounded-2xl border-2 bg-white p-1.5">
        <div
          aria-hidden="true"
          className="text-pool-deep grid grid-cols-7 py-2 text-center text-xs font-extrabold"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <span key={day}>{weekdayShort(day)}</span>
          ))}
        </div>
        <div role="group" aria-label="Calendario de asistencia" className="grid grid-cols-7 gap-1">
          {compactMonthCells(year, month).map((cell) => {
            if (!cell.inMonth)
              return <span key={cell.iso} aria-hidden="true" className="min-h-12" />;
            const dayRecords = byDay.get(cell.iso) ?? [];
            const status = getDayStatus(dayRecords);
            const label = profiles
              .map((profile) => {
                const own = getDayStatus(
                  dayRecords.filter((record) => record.player_id === profile.id),
                );
                return `${profile.full_name}: ${own ? labels[own] : "sin entrenamiento"}`;
              })
              .join(", ");
            return (
              <button
                key={cell.iso}
                type="button"
                aria-label={`${formatLongDate(`${cell.iso}T12:00:00`)}: ${label}`}
                aria-pressed={selected === cell.iso}
                onClick={() => setSelected(selected === cell.iso ? null : cell.iso)}
                className={cn(
                  "focus-visible:outline-pool-blue flex min-h-12 min-w-0 items-center justify-center rounded-lg border text-base font-extrabold tabular-nums focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1",
                  status ? tones[status] : "text-pool-deep border-slate-400 bg-slate-50",
                  selected === cell.iso && "ring-pool-deep ring-2 ring-offset-1",
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
      <div
        aria-label="Leyenda de asistencia"
        className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-extrabold"
      >
        <span className={cn("rounded-lg border px-1 py-2", tones.present)}>Asistió</span>
        <span className={cn("rounded-lg border px-1 py-2", tones.absent)}>No asistió</span>
        <span className={cn("rounded-lg border px-1 py-2", tones.unreviewed)}>Sin revisar</span>
        {mixed && (
          <span className={cn("col-span-3 rounded-lg border px-2 py-1.5", tones.mixed)}>
            Parcial: ese día asistió a unos entrenamientos y faltó a otros.
          </span>
        )}
      </div>
      {inlineDetail && selected && (
        <section aria-label="Detalle del día seleccionado" className="grid gap-2">
          <h3 className="text-pool-deep text-sm font-extrabold first-letter:uppercase">
            {formatLongDate(`${selected}T12:00:00`)}
          </h3>
          <DayDetail records={selectedRecords} profiles={profiles} />
        </section>
      )}
      {!inlineDetail && (
        <ActaGuardSheet
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          context="Asistencia"
          title={selected ? formatLongDate(`${selected}T12:00:00`) : "Asistencia del día"}
          description="Asistencias, faltas y entrenamientos sin revisar del día seleccionado."
          icon="saved"
          actions={[]}
          body={<DayDetail records={selectedRecords} profiles={profiles} />}
        />
      )}
    </div>
  );
}

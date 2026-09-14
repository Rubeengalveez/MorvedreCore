"use client";

import { cn } from "@/lib/utils/cn";
import { CalendarMarker, type CalendarMarkerKind } from "./calendar-key";
import type { CalendarData, CalendarMatch, CalendarTraining } from "@/server/queries/calendar";
import {
  getMonthCells,
  isSameLocalDay,
  monthLabel,
  weekdayShort,
  type YearMonth,
} from "@/lib/domain/calendar";

export interface MonthViewProps {
  year: number;
  month: number;
  eventsByDay: CalendarData;
  onDayClick: (iso: string) => void;
  selectedIso?: string;
  availabilityByDay?: Map<string, boolean>;
  activeProfileId?: string;
  userAttendanceBySession?: Map<string, boolean>;
}

function buildDayItems(
  day: { trainings: CalendarTraining[]; matches: CalendarMatch[] } | undefined,
): Array<{
  kind: "training" | "match";
  id: string;
  scheduled_at: string;
  cancelled: boolean;
  status: string;
  team_color: string;
  team_label: string;
}> {
  if (!day) return [];
  const items: Array<{
    kind: "training" | "match";
    id: string;
    scheduled_at: string;
    cancelled: boolean;
    status: string;
    team_color: string;
    team_label: string;
  }> = [];
  for (const t of day.trainings) {
    items.push({
      kind: "training",
      id: t.id,
      scheduled_at: t.scheduled_at,
      cancelled: t.cancelled,
      status: t.cancelled ? "cancelled" : "scheduled",
      team_color: t.team_color,
      team_label: t.team_label,
    });
  }
  for (const m of day.matches) {
    items.push({
      kind: "match",
      id: m.id,
      scheduled_at: m.scheduled_at,
      cancelled: m.status === "cancelled",
      status: m.status,
      team_color: m.team_color,
      team_label: m.team_label,
    });
  }
  items.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return items;
}

export function MonthView({
  year,
  month,
  eventsByDay,
  onDayClick,
  selectedIso,
  availabilityByDay = new Map(),
  userAttendanceBySession = new Map(),
}: MonthViewProps) {
  const cells = getMonthCells(year, month);
  const today = new Date();

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div
        aria-hidden="true"
        className="border-ink-200/50 text-ink-600 grid grid-cols-7 border-b pb-1 text-center text-xs font-extrabold tracking-[0.08em] uppercase select-none"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
          <span key={wd}>{weekdayShort(wd)}</span>
        ))}
      </div>

      <div
        aria-label={`Mes de ${monthLabel({ year, month } as YearMonth)}`}
        className="grid flex-1 grid-cols-7 gap-1"
      >
        {cells.map((cell) => {
          const items = buildDayItems(eventsByDay.get(cell.iso));
          const unavailable = availabilityByDay.get(cell.iso) === false;
          const isToday = isSameLocalDay(cell.date, today);
          const isSelected = selectedIso === cell.iso;
          const hasItems = items.length > 0;
          const hasTraining = items.some((it) => it.kind === "training" && !it.cancelled);
          const hasMatch = items.some((it) => it.kind === "match" && it.status !== "cancelled");
          const hasPostponed = items.some((it) => it.status === "postponed");
          const hasCancelled = items.some((it) => it.cancelled || it.status === "cancelled");
          const attendanceValues = items
            .filter(
              (item) =>
                item.kind === "training" && !item.cancelled && userAttendanceBySession.has(item.id),
            )
            .map((item) => userAttendanceBySession.get(item.id)!);
          const hasAttended = attendanceValues.some((present) => present);
          const hasAbsent = attendanceValues.some((present) => !present);
          const attendanceStatus =
            hasAttended && hasAbsent
              ? "mixed"
              : hasAbsent
                ? "absent"
                : hasAttended
                  ? "present"
                  : null;

          const indicators: CalendarMarkerKind[] = [];
          if (hasTraining) indicators.push("training");
          if (hasMatch) indicators.push("match");
          if (hasCancelled) indicators.push("cancelled");
          if (hasPostponed) indicators.push("postponed");
          if (unavailable) indicators.push("unavailable");

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onDayClick(cell.iso)}
              aria-label={`${cell.iso}${hasTraining ? ", entrenamiento" : ""}${hasMatch ? ", partido" : ""}${hasCancelled ? ", actividad cancelada" : ""}${hasPostponed ? ", partido aplazado" : ""}${hasItems ? `, ${items.length} evento(s)` : ""}${attendanceStatus === "present" ? ", asistió" : attendanceStatus === "absent" ? ", no asistió" : attendanceStatus === "mixed" ? ", asistencia parcial" : ""}${unavailable ? ", no disponible" : ""}${isToday ? ", hoy" : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-lg border p-1 text-center transition-[background-color,border-color,color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                "focus-visible:ring-pool-blue focus-visible:ring-offset-paper focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                "h-12 active:scale-95",
                !cell.inMonth
                  ? "pointer-events-none border-transparent bg-transparent opacity-15"
                  : attendanceStatus === "present"
                    ? "border-emerald-300 bg-emerald-100 text-emerald-950"
                    : attendanceStatus === "absent"
                      ? "border-red-300 bg-red-100 text-red-950"
                      : attendanceStatus === "mixed"
                        ? "border-amber-300 bg-amber-100 text-amber-950"
                        : "border-ink-200 bg-paper text-ink-900 hover:bg-pool-foam/40",
                cell.inMonth && isToday && "border-pool-blue border-2",
                cell.inMonth && isSelected && "ring-2 ring-pool-deep ring-inset",
              )}
            >
              <span className="font-mono text-sm font-extrabold select-none md:text-base">
                {cell.day}
              </span>
              <span className="mt-0.5 flex h-3.5 items-center justify-center gap-0.5">
                {cell.inMonth ? (
                  <>
                    {indicators.slice(0, indicators.length > 2 ? 1 : 2).map((kind) => <CalendarMarker key={kind} kind={kind} compact />)}
                    {indicators.length > 2 ? <span className="text-[10px] font-bold" aria-label={`${indicators.length - 1} indicadores más`}>+{indicators.length - 1}</span> : null}
                  </>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

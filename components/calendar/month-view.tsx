"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { CalendarMarker, type CalendarMarkerKind } from "./calendar-key";
import type { CalendarData } from "@/server/queries/calendar";
import { monthLabel, todayIso, weekdayShort } from "@/lib/domain/calendar";
import {
  compactMonthCells,
  calendarAttendanceStatus,
  groupCalendarTrainings,
} from "@/lib/domain/calendar-presentation";

export interface MonthViewProps {
  year: number;
  month: number;
  eventsByDay: CalendarData;
  onDayClick: (iso: string) => void;
  selectedIso?: string;
}

export function MonthView({ year, month, eventsByDay, onDayClick, selectedIso }: MonthViewProps) {
  const cells = compactMonthCells(year, month);
  const today = todayIso();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const focusDay = cells.some((cell) => cell.inMonth && cell.iso === selectedIso)
    ? selectedIso
    : cells.find((cell) => cell.inMonth)?.iso;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        aria-hidden="true"
        className="text-pool-deep grid grid-cols-7 text-center text-xs font-extrabold"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <span key={day}>{weekdayShort(day)}</span>
        ))}
      </div>
      <div
        role="group"
        aria-label={`Mes de ${monthLabel({ year, month })}`}
        className="grid grid-cols-7 gap-0.5"
      >
        {cells.map((cell, index) => {
          if (!cell.inMonth)
            return (
              <span
                key={cell.iso}
                aria-hidden="true"
                className="flex min-h-12 items-center justify-center text-sm font-bold text-slate-500"
              >
                {cell.day}
              </span>
            );
          const day = eventsByDay.get(cell.iso);
          const trainings = groupCalendarTrainings(day?.trainings ?? []);
          const matches = day?.matches ?? [];
          const attended = calendarAttendanceStatus(trainings);
          const hasTraining = trainings.some((training) => !training.cancelled);
          const hasMatch = matches.some(
            (match) => match.status !== "cancelled" && match.status !== "postponed",
          );
          const hasCancelled =
            trainings.some((training) => training.cancelled) ||
            matches.some((match) => match.status === "cancelled");
          const hasPostponed = matches.some((match) => match.status === "postponed");
          const markers: CalendarMarkerKind[] = [];
          if (hasTraining) markers.push("training");
          if (hasMatch) markers.push("match");
          if (!hasTraining && !hasMatch && hasCancelled) markers.push("cancelled");
          if (!hasMatch && hasPostponed) markers.push("postponed");
          const date = new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "long",
            weekday: "long",
          }).format(cell.date);
          const descriptions = [
            date,
            trainings.length + matches.length > 1 &&
              `${trainings.length + matches.length} actividades`,
            hasTraining && "entrenamiento",
            hasMatch && "partido",
            hasCancelled && "actividad cancelada",
            hasPostponed && "partido aplazado",
            attended === "present" && "asistió",
            attended === "absent" && "no asistió",
            attended === "mixed" && "asistencia parcial",
            attended === "unreviewed" && "sin revisar, asistencia provisional",
            cell.iso === today && "hoy",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={cell.iso}
              ref={(node) => {
                if (node) buttons.current.set(cell.iso, node);
                else buttons.current.delete(cell.iso);
              }}
              type="button"
              tabIndex={cell.iso === focusDay ? 0 : -1}
              aria-label={descriptions}
              aria-pressed={cell.iso === selectedIso}
              aria-current={cell.iso === today ? "date" : undefined}
              onClick={() => onDayClick(cell.iso)}
              onKeyDown={(event) => {
                const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
                  event.key
                ];
                let next =
                  delta !== undefined
                    ? index + delta
                    : event.key === "Home"
                      ? index - (cell.weekdayMonFirst - 1)
                      : event.key === "End"
                        ? index + (7 - cell.weekdayMonFirst)
                        : null;
                if (next === null) return;
                event.preventDefault();
                next = Math.max(
                  cells.findIndex((item) => item.inMonth),
                  Math.min(
                    cells.findLastIndex((item) => item.inMonth),
                    next,
                  ),
                );
                const target = cells[next];
                if (target) buttons.current.get(target.iso)?.focus();
              }}
              className={cn(
                "text-pool-deep focus-visible:outline-pool-blue relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-0.5 py-1 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1",
                attended === "present"
                  ? "border-green-800 bg-green-100"
                  : attended === "absent"
                    ? "border-red-800 bg-red-100"
                    : attended === "mixed"
                      ? "border-violet-800 bg-violet-100"
                      : attended === "unreviewed"
                        ? "border-amber-800 bg-amber-100"
                        : "border-pool-deep/55 bg-white hover:bg-blue-50",
                cell.iso === today && "border-pool-blue border-2",
                cell.iso === selectedIso && "ring-pool-deep ring-2 ring-inset",
              )}
            >
              <span className="text-base leading-none font-extrabold tabular-nums">{cell.day}</span>
              <span className="flex h-4 items-center justify-center gap-0.5" aria-hidden="true">
                {markers.slice(0, 3).map((kind) => (
                  <CalendarMarker key={kind} kind={kind} compact />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import {
  getMonthCells,
  isSameLocalDay,
  monthLabel,
  weekdayShort,
  type MonthCell,
  type YearMonth,
} from "@/lib/domain/calendar";
import type { CalendarData } from "@/server/queries/calendar";
import { cn } from "@/lib/utils/cn";

export interface MonthViewDay {
  iso: string;
  hasTraining: boolean;
  hasMatch: boolean;
  hasCancelled: boolean;
}

export interface MonthViewProps {
  year: number;
  month: number;
  eventsByDay: CalendarData;
  onDayClick: (iso: string) => void;
  selectedIso?: string;
}

function buildDaySummary(
  cell: MonthCell,
  eventsByDay: CalendarData,
): MonthViewDay {
  const day = eventsByDay.get(cell.iso);
  if (!day) {
    return {
      iso: cell.iso,
      hasTraining: false,
      hasMatch: false,
      hasCancelled: false,
    };
  }
  const hasCancelled =
    day.trainings.some((t) => t.cancelled) ||
    day.matches.some((m) => m.status === "cancelled");
  return {
    iso: cell.iso,
    hasTraining: day.trainings.length > 0,
    hasMatch: day.matches.length > 0,
    hasCancelled,
  };
}

export function MonthView({
  year,
  month,
  eventsByDay,
  onDayClick,
  selectedIso,
}: MonthViewProps) {
  const cells = getMonthCells(year, month);
  const today = new Date();

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-600"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
          <span key={wd}>{weekdayShort(wd)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const summary = buildDaySummary(cell, eventsByDay);
          const isToday = isSameLocalDay(cell.date, today);
          const isSelected = selectedIso === cell.iso;
          return (
            <DayCell
              key={cell.iso}
              cell={cell}
              summary={summary}
              isToday={isToday}
              isSelected={isSelected}
              onClick={() => onDayClick(cell.iso)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-ink-600">
        <Legend color="var(--brand-blue)" label="Entreno" />
        <Legend color="var(--brand-action)" label="Partido" />
        <Legend color="var(--danger)" label="Cancelado" />
      </div>
      <p className="sr-only">{monthLabel({ year, month } as YearMonth)}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function DayCell({
  cell,
  summary,
  isToday,
  isSelected,
  onClick,
}: {
  cell: MonthCell;
  summary: MonthViewDay;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={cell.iso}
      aria-pressed={isSelected}
      className={cn(
        "relative flex h-14 min-h-14 flex-col items-center justify-center gap-1 rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:h-16",
        cell.inMonth
          ? "border-ink-300 bg-paper text-ink-900 hover:bg-brand-foam"
          : "border-transparent bg-transparent text-ink-300 hover:bg-brand-foam/50",
        isSelected ? "ring-2 ring-brand-blue" : "",
        isToday ? "border-brand-deep" : "",
      )}
    >
      <span
        className={cn(
          "font-mono text-sm font-bold leading-none",
          isToday ? "text-brand-deep" : "",
        )}
      >
        {cell.day}
      </span>
      <div className="flex items-center gap-1">
        {summary.hasMatch ? (
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--brand-action)" }}
          />
        ) : null}
        {summary.hasTraining ? (
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--brand-blue)" }}
          />
        ) : null}
        {summary.hasCancelled ? (
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--danger)" }}
          />
        ) : null}
      </div>
    </button>
  );
}

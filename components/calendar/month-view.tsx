"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { CalendarData } from "@/server/queries/calendar";
import {
  addDaysIso,
  getMonthCells,
  isSameLocalDay,
  monthLabel,
  todayIso,
  weekdayShort,
  type MonthCell,
  type YearMonth,
} from "@/lib/domain/calendar";
import { matchColor, trainingColor } from "@/lib/domain/event-colors";

export interface MonthViewProps {
  year: number;
  month: number;
  eventsByDay: CalendarData;
  onDayClick: (iso: string) => void;
  selectedIso?: string;
  availabilityByDay?: Map<string, boolean>;
}

interface DaySummary {
  iso: string;
  hasTraining: boolean;
  hasMatch: boolean;
  hasCancelled: boolean;
  hasUnavailable: boolean;
  primaryColor: string | null;
}

function buildDaySummary(
  cell: MonthCell,
  eventsByDay: CalendarData,
  availabilityByDay: Map<string, boolean>,
  today: Date,
): DaySummary {
  const day = eventsByDay.get(cell.iso);
  const unavailable = availabilityByDay.get(cell.iso) === false;
  if (!day && !unavailable) {
    return {
      iso: cell.iso,
      hasTraining: false,
      hasMatch: false,
      hasCancelled: false,
      hasUnavailable: false,
      primaryColor: null,
    };
  }
  const hasTraining = (day?.trainings.length ?? 0) > 0;
  const hasMatch = (day?.matches.length ?? 0) > 0;
  const hasCancelled =
    (day?.trainings.some((t) => t.cancelled) ?? false) ||
    (day?.matches.some((m) => m.status === "cancelled") ?? false);
  const cellDate = cell.date;
  const now = today;
  const isPast = cellDate < now;
  let primary: string | null = null;
  if (hasMatch) {
    const m = day?.matches.find((x) => x.status !== "cancelled") ?? day?.matches[0];
    if (m) {
      const matchDate = new Date(m.scheduled_at);
      primary = matchColor({
        competitionType: m.competition_type,
        status: m.status,
        isPast: matchDate < now,
        unavailable: false,
      });
    }
  }
  if (!primary && hasTraining) {
    const t = day?.trainings.find((x) => !x.cancelled) ?? day?.trainings[0];
    if (t) {
      const tDate = new Date(t.scheduled_at);
      primary = trainingColor({
        cancelled: t.cancelled,
        isPast: tDate < now,
        unavailable: false,
      });
    }
  }
  if (!primary && unavailable) {
    primary = "var(--ink-300)";
  }
  return {
    iso: cell.iso,
    hasTraining,
    hasMatch,
    hasCancelled,
    hasUnavailable: unavailable,
    primaryColor: primary,
  };
}

export function MonthView({
  year,
  month,
  eventsByDay,
  onDayClick,
  selectedIso,
  availabilityByDay = new Map(),
}: MonthViewProps) {
  const cells = getMonthCells(year, month);
  const today = new Date();
  const todayIsoValue = todayIso();

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
      <div
        role="grid"
        aria-label={`Mes de ${monthLabel({ year, month } as YearMonth)}`}
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((cell) => {
          const summary = buildDaySummary(
            cell,
            eventsByDay,
            availabilityByDay,
            today,
          );
          const isToday = isSameLocalDay(cell.date, today);
          const isSelected = selectedIso === cell.iso;
          const hasContent =
            summary.hasTraining ||
            summary.hasMatch ||
            summary.hasUnavailable;
          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              onClick={() => onDayClick(cell.iso)}
              aria-label={cell.iso}
              aria-pressed={isSelected}
              className={cn(
                "relative flex h-14 min-h-14 flex-col items-center justify-center gap-1 rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:h-16",
                cell.inMonth
                  ? "border-ink-300 bg-paper text-ink-900 hover:bg-brand-foam"
                  : "border-transparent bg-transparent text-ink-300 hover:bg-brand-foam/50",
                isSelected ? "ring-2 ring-brand-blue" : "",
                isToday ? "border-brand-deep font-bold" : "",
              )}
            >
              <span
                className={cn(
                  "font-mono text-sm leading-none",
                  isToday ? "text-brand-deep" : "",
                )}
              >
                {cell.day}
              </span>
              {hasContent ? (
                <div className="flex items-center gap-1">
                  {summary.hasMatch ? (
                    <span
                      aria-hidden="true"
                      className="block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "var(--brand-ball)" }}
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
                  {summary.hasUnavailable ? (
                    <span
                      aria-hidden="true"
                      className="block h-1.5 w-1.5 rounded-full bg-ink-300 ring-1 ring-ink-600"
                    />
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

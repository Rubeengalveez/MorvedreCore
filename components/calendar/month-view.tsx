"use client";

import { cn } from "@/lib/utils/cn";
import type { CalendarData, CalendarTraining, CalendarMatch } from "@/server/queries/calendar";
import {
  getMonthCells,
  isSameLocalDay,
  monthLabel,
  weekdayShort,
  type YearMonth,
} from "@/lib/domain/calendar";
import { matchColor, trainingColor } from "@/lib/domain/event-colors";
import { CalendarEventChip } from "./event-card";

export interface MonthViewProps {
  year: number;
  month: number;
  eventsByDay: CalendarData;
  onDayClick: (iso: string) => void;
  selectedIso?: string;
  availabilityByDay?: Map<string, boolean>;
  activeProfileId?: string;
}

function buildDayItems(
  day: { trainings: CalendarTraining[]; matches: CalendarMatch[] } | undefined,
): Array<{ kind: "training" | "match"; id: string; title: string; scheduled_at: string; cancelled: boolean; status: string; competition_type: string }> {
  if (!day) return [];
  const items: Array<{ kind: "training" | "match"; id: string; title: string; scheduled_at: string; cancelled: boolean; status: string; competition_type: string }> = [];
  for (const t of day.trainings) {
    items.push({
      kind: "training",
      id: t.id,
      title: `Entreno ${t.team_label}`,
      scheduled_at: t.scheduled_at,
      cancelled: t.cancelled,
      status: t.cancelled ? "cancelled" : "scheduled",
      competition_type: "training",
    });
  }
  for (const m of day.matches) {
    items.push({
      kind: "match",
      id: m.id,
      title: m.is_home ? `${m.team_label} vs ${m.opponent}` : `${m.opponent} vs ${m.team_label}`,
      scheduled_at: m.scheduled_at,
      cancelled: m.status === "cancelled",
      status: m.status,
      competition_type: m.competition_type,
    });
  }
  items.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return items;
}

function getDayColor(items: ReturnType<typeof buildDayItems>): string {
  const m = items.find((i) => i.kind === "match" && i.status !== "cancelled");
  if (m) {
    return matchColor({
      competitionType: m.competition_type,
      status: m.status,
      isPast: new Date(m.scheduled_at) < new Date(),
      unavailable: false,
    });
  }
  const t = items.find((i) => i.kind === "training" && !i.cancelled);
  if (t) {
    return trainingColor({
      cancelled: t.cancelled,
      isPast: new Date(t.scheduled_at) < new Date(),
      unavailable: false,
    });
  }
  return "var(--ink-300)";
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

  return (
    <div className="flex flex-col gap-2">
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-ink-600"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
          <span key={wd}>{weekdayShort(wd)}</span>
        ))}
      </div>
      <div
        aria-label={`Mes de ${monthLabel({ year, month } as YearMonth)}`}
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((cell) => {
          const day = eventsByDay.get(cell.iso);
          const items = buildDayItems(day);
          const unavailable = availabilityByDay.get(cell.iso) === false;
          const isToday = isSameLocalDay(cell.date, today);
          const isSelected = selectedIso === cell.iso;
          const isPast = cell.date < today;
          const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          const hasItems = items.length > 0;
          const accent = hasItems ? getDayColor(items) : "var(--ink-300)";
          const visibleItems = items.slice(0, 2);
          const extraCount = items.length - visibleItems.length;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onDayClick(cell.iso)}
              aria-label={`${cell.iso}${hasItems ? `, ${items.length} evento(s)` : ""}${unavailable ? ", no disponible" : ""}${isToday ? ", hoy" : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex h-16 min-h-16 flex-col items-stretch gap-0.5 rounded border p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:h-20",
                !cell.inMonth
                  ? "border-transparent bg-transparent text-ink-300"
                  : isPast
                    ? "border-ink-300 bg-paper"
                    : isWeekend
                      ? "border-ink-300 bg-paper"
                      : "border-ink-300 bg-paper",
                isSelected ? "ring-2 ring-pool-blue" : "",
                isToday ? "ring-1 ring-pool-deep/30" : "",
                isToday ? "bg-pool-foam/40" : "",
                isToday ? "border-pool-deep/30" : "",
                unavailable ? "bg-ink-300/30" : "",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[11px] font-bold leading-none",
                    isToday ? "text-pool-deep" : "",
                    !cell.inMonth && "text-ink-300",
                  )}
                >
                  {cell.day}
                </span>
                {hasItems ? (
                  <span
                    aria-hidden="true"
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                ) : unavailable ? (
                  <span
                    aria-hidden="true"
                    className="block h-1.5 w-1.5 rounded-full bg-ink-300 ring-1 ring-ink-600"
                  />
                ) : null}
              </div>
              {cell.inMonth && visibleItems.length > 0 ? (
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {visibleItems.map((it) => (
                    <CalendarEventChip
                      key={it.id}
                      event={{
                        id: it.id,
                        kind: it.kind,
                        scheduled_at: it.scheduled_at,
                        title: it.title,
                        team_label: "",
                        team_color: accent,
                        cancelled: it.cancelled,
                        status: it.status,
                      }}
                    />
                  ))}
                  {extraCount > 0 ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-600">
                      +{extraCount} más
                    </span>
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

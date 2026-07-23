"use client";

import { cn } from "@/lib/utils/cn";
import { Gorro, SilbatoActivo } from "@/components/brand/pictograms";
import { Check, Minus, X } from "lucide-react";
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
          const teamDots = items
            .filter((it) => !it.cancelled && it.status !== "cancelled")
            .slice(0, 3);

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onDayClick(cell.iso)}
              aria-label={`${cell.iso}${hasItems ? `, ${items.length} evento(s)` : ""}${attendanceStatus === "present" ? ", asistió" : attendanceStatus === "absent" ? ", no asistió" : attendanceStatus === "mixed" ? ", asistencia parcial" : ""}${unavailable ? ", no disponible" : ""}${isToday ? ", hoy" : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-lg border p-1 text-center transition-[background-color,border-color,color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                "focus-visible:ring-pool-blue focus-visible:ring-offset-paper focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                "touch-target active:scale-95",
                !cell.inMonth
                  ? "pointer-events-none border-transparent bg-transparent opacity-15"
                  : isSelected
                    ? hasMatch
                      ? "bg-ball-gold text-pool-deep border-ball-gold scale-[1.03] shadow-md"
                      : hasTraining
                        ? "border-pool-blue bg-pool-blue text-paper scale-[1.03] shadow-md"
                        : hasCancelled
                          ? "border-goggle-red bg-goggle-red text-paper scale-[1.03] shadow-md"
                          : "border-pool-deep bg-pool-deep text-paper scale-[1.03] shadow-md"
                    : isToday
                      ? "border-pool-blue/70 bg-pool-foam/30 text-pool-deep border-2 font-extrabold"
                      : attendanceStatus === "absent"
                        ? "border-danger/45 bg-danger/10 text-danger font-extrabold"
                        : attendanceStatus === "present"
                          ? "border-success/40 bg-success/10 text-pool-deep font-extrabold"
                          : attendanceStatus === "mixed"
                            ? "border-pool-blue/40 bg-pool-foam text-pool-deep font-extrabold"
                            : hasMatch
                              ? "border-ball-gold/40 bg-ball-gold/10 text-pool-deep hover:bg-ball-gold/20 font-extrabold"
                              : hasTraining
                                ? "border-pool-blue/15 bg-pool-foam/60 text-pool-deep hover:bg-pool-foam font-semibold"
                                : hasCancelled
                                  ? "border-goggle-red/25 bg-goggle-red/5 text-goggle-red hover:bg-goggle-red/10 font-semibold"
                                  : unavailable
                                    ? "border-ink-200/50 bg-ink-100/60 text-ink-400 opacity-65"
                                    : "border-ink-200/60 bg-paper text-ink-900 hover:bg-ink-50/70",
              )}
            >
              <span className="font-mono text-sm font-extrabold select-none md:text-base">
                {cell.day}
              </span>
              {cell.inMonth && (hasItems || unavailable) ? (
                <div className="mt-0.5 flex h-4 items-center justify-center gap-0.5 select-none">
                  {hasTraining ? (
                    <SilbatoActivo
                      className="h-3 w-3 shrink-0"
                      accent={isSelected ? "#fff" : "var(--pool-blue)"}
                    />
                  ) : null}
                  {hasMatch ? (
                    <Gorro
                      className="h-3 w-3 shrink-0"
                      accent={isSelected ? "#fff" : "var(--ball-gold)"}
                    />
                  ) : null}
                  {hasCancelled ? (
                    <span
                      className={cn(
                        "text-xs font-extrabold",
                        isSelected ? "text-paper" : "text-goggle-red",
                      )}
                    >
                      X
                    </span>
                  ) : null}
                  {attendanceStatus === "present" ? (
                    <Check
                      className={cn("h-3.5 w-3.5", isSelected ? "text-paper" : "text-success")}
                      aria-hidden="true"
                    />
                  ) : attendanceStatus === "absent" ? (
                    <X
                      className={cn("h-3.5 w-3.5", isSelected ? "text-paper" : "text-danger")}
                      aria-hidden="true"
                    />
                  ) : attendanceStatus === "mixed" ? (
                    <Minus
                      className={cn("h-3.5 w-3.5", isSelected ? "text-paper" : "text-pool-blue")}
                      aria-hidden="true"
                    />
                  ) : null}
                  {unavailable && !hasItems ? (
                    <span
                      className={cn(
                        "bg-ink-400 h-1.5 w-1.5 rounded-full",
                        isSelected && "bg-paper",
                      )}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="mt-0.5 h-4" />
              )}
              {teamDots.length > 0 ? (
                <div className="absolute inset-x-1 bottom-1 flex gap-0.5">
                  {teamDots.map((item) => (
                    <span
                      key={`${item.kind}-${item.id}`}
                      className="h-0.5 flex-1 rounded-full"
                      style={{ backgroundColor: isSelected ? "var(--paper)" : item.team_color }}
                    />
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

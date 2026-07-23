"use client";

import { cn } from "@/lib/utils/cn";
import type { CalendarData } from "@/server/queries/calendar";
import { todayIso, weekdayLong } from "@/lib/domain/calendar";
import { TrainingRow, MatchRow } from "./event-sheet";

export interface WeekViewProps {
  startIso: string;
  eventsByDay: CalendarData;
  onDayClick?: (iso: string) => void;
  onEventClick?: (kind: "training" | "match", id: string) => void;
  selectedIso?: string;
  availabilityByDay?: Map<string, boolean>;
  userAttendanceBySession?: Map<string, boolean>;
  showAttendance?: boolean;
  isCoach: boolean;
  isAdmin: boolean;
  activeProfileId: string;
}

function getDayLabels(startIso: string): { iso: string; date: Date }[] {
  const out: { iso: string; date: Date }[] = [];
  const [y, m, d] = startIso.split("-").map(Number);
  if (y == null || m == null || d == null) return out;
  for (let i = 0; i < 7; i++) {
    const dd = new Date(y, m - 1, d + i);
    out.push({
      iso: `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`,
      date: dd,
    });
  }
  return out;
}

export function WeekView({
  startIso,
  eventsByDay,
  availabilityByDay = new Map(),
  isCoach,
  isAdmin,
  activeProfileId,
}: WeekViewProps) {
  const days = getDayLabels(startIso);
  const todayIsoValue = todayIso();

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex flex-col select-none">
        {days.map((d, index) => {
          const isToday = d.iso === todayIsoValue;
          const dayData = eventsByDay.get(d.iso);
          const hasEvents = dayData && (dayData.trainings.length > 0 || dayData.matches.length > 0);
          const unavailable = availabilityByDay.get(d.iso) === false;

          return (
            <div key={`week-day-${d.iso}`} className="group flex items-stretch gap-1">
              <div className="relative flex w-16 shrink-0 flex-col items-center py-3">
                {index < 6 && (
                  <div className="bg-ink-200/60 pointer-events-none absolute top-14 bottom-0 z-0 w-0.5" />
                )}

                <span className="text-ink-600 mb-1 text-xs font-extrabold tracking-wider uppercase">
                  {weekdayLong(d.date.getDay() === 0 ? 7 : d.date.getDay()).slice(0, 3)}
                </span>

                <span
                  className={cn(
                    "z-10 flex h-9 w-9 items-center justify-center rounded-full font-mono text-sm font-extrabold shadow-sm transition-transform duration-200 group-hover:scale-105",
                    isToday
                      ? "bg-pool-blue text-paper ring-pool-blue/30 scale-105 animate-[pulse_2s_infinite] font-extrabold ring-2"
                      : "bg-paper-card border-ink-300 text-ink-900 border",
                  )}
                >
                  {d.date.getDate()}
                </span>

                {unavailable && (
                  <span className="text-goggle-red mt-1 shrink-0 text-xs font-extrabold uppercase">
                    No disponible
                  </span>
                )}
              </div>

              <div className="border-ink-200/50 flex-1 border-b py-3 pl-2 last:border-b-0">
                {!hasEvents ? (
                  <div className="bg-pool-ice/30 border-ink-200/30 text-ink-500 font-display flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-semibold select-none">
                    <span className="bg-ink-400 h-1.5 w-1.5 rounded-full opacity-60" />
                    <span>Sin actividades · Descanso</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {dayData.trainings.map((t) => (
                      <TrainingRow key={t.id} training={t} isCoach={isCoach || isAdmin} compact />
                    ))}
                    {dayData.matches.map((m) => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        isCoach={isCoach || isAdmin}
                        activeProfileId={activeProfileId}
                        onChanged={() => {}}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

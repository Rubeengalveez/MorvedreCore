"use client";

import { cn } from "@/lib/utils/cn";
import type { CalendarData } from "@/server/queries/calendar";
import { todayIso, weekdayShort } from "@/lib/domain/calendar";
import { matchColor, trainingColor } from "@/lib/domain/event-colors";

export interface WeekViewProps {
  startIso: string;
  eventsByDay: CalendarData;
  onDayClick?: (iso: string) => void;
  onEventClick?: (kind: "training" | "match", id: string) => void;
  selectedIso?: string;
  availabilityByDay?: Map<string, boolean>;
}

interface EventBlock {
  id: string;
  kind: "training" | "match";
  iso: string;
  startHour: number;
  endHour: number;
  color: string;
  title: string;
  subtitle: string;
  cancelled: boolean;
}

const HOUR_START = 8;
const HOUR_END = 22;
const HOURS: number[] = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i,
);

function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function timeToHour(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

function buildDayEvents(
  iso: string,
  eventsByDay: CalendarData,
  availabilityByDay: Map<string, boolean>,
): EventBlock[] {
  const day = eventsByDay.get(iso);
  const unavailable = availabilityByDay.get(iso) === false;
  const blocks: EventBlock[] = [];
  for (const t of day?.trainings ?? []) {
    const start = timeToHour(t.scheduled_at);
    const end = start + (t.duration_minutes / 60);
    blocks.push({
      id: t.id,
      kind: "training",
      iso,
      startHour: start,
      endHour: end,
      color: trainingColor({
        cancelled: t.cancelled,
        isPast: new Date(t.scheduled_at) < new Date(),
        unavailable: false,
      }),
      title: `Entreno ${t.team_label}`,
      subtitle: t.location ?? "",
      cancelled: t.cancelled,
    });
  }
  for (const m of day?.matches ?? []) {
    const start = timeToHour(m.scheduled_at);
    const end = start + 2;
    blocks.push({
      id: m.id,
      kind: "match",
      iso,
      startHour: start,
      endHour: end,
      color: matchColor({
        competitionType: m.competition_type,
        status: m.status,
        isPast: new Date(m.scheduled_at) < new Date(),
        unavailable: false,
      }),
      title: m.is_home
        ? `${m.team_label} vs ${m.opponent}`
        : `${m.opponent} vs ${m.team_label}`,
      subtitle: m.pool_name ?? m.location ?? "",
      cancelled: m.status === "cancelled" || m.status === "postponed",
    });
  }
  if (unavailable) {
    blocks.push({
      id: `${iso}-unavailable`,
      kind: "training",
      iso,
      startHour: HOUR_START,
      endHour: HOUR_END,
      color: "var(--ink-300)",
      title: "No disponible",
      subtitle: "Marcado por ti",
      cancelled: false,
    });
  }
  return blocks;
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
  onDayClick,
  onEventClick,
  selectedIso,
  availabilityByDay = new Map(),
}: WeekViewProps) {
  const days = getDayLabels(startIso);
  const todayIsoValue = todayIso();

  const HOUR_HEIGHT = 56;
  const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="flex flex-col gap-3">
      {/* Cabecera de días */}
      <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1">
        <div />
        {days.map((d) => {
          const isToday = d.iso === todayIsoValue;
          return (
            <button
              key={`header-${d.iso}`}
              type="button"
              onClick={() => onDayClick?.(d.iso)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded py-1 text-center transition-colors hover:bg-brand-foam",
                isToday ? "bg-brand-foam" : "",
              )}
              aria-label={d.iso}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-600">
                {weekdayShort(d.date.getDay() === 0 ? 7 : d.date.getDay())}
              </span>
              <span
                className={cn(
                  "font-mono text-base font-bold",
                  isToday ? "text-brand-deep" : "text-ink-900",
                )}
              >
                {d.date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid del calendario semanal */}
      <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1">
        {/* Columna de etiquetas de horas */}
        <div className="relative select-none" style={{ height: `${TOTAL_HEIGHT}px` }}>
          {HOURS.map((h, i) => (
            <div
              key={`hour-${h}`}
              aria-hidden="true"
              className="absolute right-1 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-500"
              style={{
                top: `${i * HOUR_HEIGHT + 4}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              {hourLabel(h)}
            </div>
          ))}
        </div>

        {/* Columnas diarias con eventos absolutos */}
        {days.map((d) => {
          const dayEvents = buildDayEvents(
            d.iso,
            eventsByDay,
            availabilityByDay,
          );
          const isSelected = selectedIso === d.iso;

          return (
            <div
              key={`col-${d.iso}`}
              onClick={() => onDayClick?.(d.iso)}
              className={cn(
                "relative border-l border-ink-300/40 bg-paper transition-colors cursor-pointer",
                isSelected ? "bg-brand-foam/20" : "",
              )}
              style={{ height: `${TOTAL_HEIGHT}px` }}
            >
              {/* Líneas de cuadrícula de fondo */}
              {HOURS.map((h, i) => (
                <div
                  key={`grid-${d.iso}-${h}`}
                  className="absolute inset-x-0 border-t border-ink-300/30 pointer-events-none"
                  style={{
                    top: `${i * HOUR_HEIGHT}px`,
                    height: `${HOUR_HEIGHT}px`,
                  }}
                />
              ))}

              {/* Renderizado de eventos en esta columna */}
              {dayEvents.map((block) => {
                const topPx = (block.startHour - HOUR_START) * HOUR_HEIGHT;
                const heightPx = (block.endHour - block.startHour) * HOUR_HEIGHT;

                const startH = Math.floor(block.startHour);
                const startM = Math.round((block.startHour - startH) * 60);
                const endH = Math.floor(block.endHour);
                const endM = Math.round((block.endHour - endH) * 60);

                const timeStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}–${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

                const isUnavailableCell = block.id.endsWith("-unavailable");

                return (
                  <button
                    key={`event-${block.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que se seleccione el día de fondo
                      if (onEventClick && !isUnavailableCell) {
                        onEventClick(block.kind, block.id);
                      } else {
                        onDayClick?.(d.iso);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: `${topPx + 2}px`,
                      height: `${heightPx - 4}px`,
                      left: "2px",
                      right: "2px",
                      backgroundColor: block.color,
                    }}
                    className={cn(
                      "flex flex-col justify-start rounded p-1 text-left text-paper transition-transform active:scale-[0.98] shadow-elev-1 overflow-hidden select-none border border-black/5",
                      block.cancelled && "opacity-60",
                      isUnavailableCell ? "cursor-default" : "cursor-pointer",
                    )}
                    title={`${block.title} (${timeStr})`}
                  >
                    <span className="line-clamp-2 text-[9px] font-bold leading-tight">
                      {block.cancelled ? (
                        <span className="line-through">{block.title}</span>
                      ) : (
                        block.title
                      )}
                    </span>
                    {heightPx >= 28 ? (
                      <span className="mt-0.5 block font-mono text-[8px] font-semibold opacity-90 leading-none">
                        {timeStr}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

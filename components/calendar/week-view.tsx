"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { CalendarData } from "@/server/queries/calendar";
import {
  addDaysIso,
  isSameLocalDay,
  todayIso,
  weekdayShort,
} from "@/lib/domain/calendar";
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
  const base = new Date(y, m - 1, d);
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
  const today = new Date();
  const todayIsoValue = todayIso();

  return (
    <div className="flex flex-col gap-3">
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
        {HOURS.map((h) => (
          <div key={`row-${h}`} className="contents">
            <div
              aria-hidden="true"
              className="self-start pt-1 text-right text-[10px] font-medium text-ink-600"
            >
              {hourLabel(h)}
            </div>
            {days.map((d) => {
              const dayEvents = buildDayEvents(
                d.iso,
                eventsByDay,
                availabilityByDay,
              );
              const block = dayEvents.find(
                (b) => h >= b.startHour && h < b.endHour,
              );
              const isHourStart = block?.startHour === h;
              return (
                <button
                  key={`cell-${d.iso}-${h}`}
                  type="button"
                  onClick={() => {
                    if (block && isHourStart && onEventClick) {
                      onEventClick(block.kind, block.id);
                    } else {
                      onDayClick?.(d.iso);
                    }
                  }}
                  aria-label={
                    block
                      ? `${block.title} ${d.iso}`
                      : `${d.iso} ${hourLabel(h)}`
                  }
                  className={cn(
                    "relative min-h-10 border-t border-l border-ink-300/50 bg-paper p-1 text-left transition-colors hover:bg-brand-foam/50",
                    selectedIso === d.iso ? "bg-brand-foam" : "",
                  )}
                >
                  {block && isHourStart ? (
                    <span
                      className="pointer-events-none block truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-paper"
                      style={{ backgroundColor: block.color }}
                      title={block.title}
                    >
                      {block.cancelled ? (
                        <span className="line-through">{block.title}</span>
                      ) : (
                        block.title
                      )}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

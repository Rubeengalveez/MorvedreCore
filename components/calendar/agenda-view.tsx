"use client";

import { Calendar, Clock, Filter } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { CalendarEventCard, CalendarEmptyState } from "./event-card";
import type { CalendarData } from "@/server/queries/calendar";
import { cn } from "@/lib/utils/cn";

export interface AgendaViewProps {
  eventsByDay: CalendarData;
  rangeStartIso: string;
  rangeEndIso: string;
  emptyMessage?: string;
  activeProfileId?: string;
  showAttendance?: boolean;
  userAttendanceBySession?: Map<string, boolean>;
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()] ?? ""}`;
}

interface FlatEvent {
  dayIso: string;
  kind: "training" | "match";
  id: string;
  title: string;
  scheduled_at: string;
  cancelled: boolean;
  status: string;
  competition_type: string;
  team_label: string;
  team_color: string;
  location: string | null;
  opponent: string;
  duration_minutes: number;
  isHome: boolean;
}

function flattenEvents(
  eventsByDay: CalendarData,
  startIso: string,
  endIso: string,
): FlatEvent[] {
  const result: FlatEvent[] = [];
  for (const [iso, day] of eventsByDay) {
    if (iso < startIso || iso > endIso) continue;
    for (const t of day.trainings) {
      result.push({
        dayIso: iso,
        kind: "training",
        id: t.id,
        title: `Entreno ${t.team_label}`,
        scheduled_at: t.scheduled_at,
        cancelled: t.cancelled,
        status: t.cancelled ? "cancelled" : "scheduled",
        competition_type: "training",
        team_label: t.team_label,
        team_color: t.team_color,
        location: t.location,
        opponent: "",
        duration_minutes: t.duration_minutes,
        isHome: true,
      });
    }
    for (const m of day.matches) {
      result.push({
        dayIso: iso,
        kind: "match",
        id: m.id,
        title: m.is_home ? `${m.team_label} vs ${m.opponent}` : `${m.opponent} vs ${m.team_label}`,
        scheduled_at: m.scheduled_at,
        cancelled: m.status === "cancelled",
        status: m.status,
        competition_type: m.competition_type,
        team_label: m.team_label,
        team_color: m.team_color,
        location: m.location,
        opponent: m.opponent,
        duration_minutes: 0,
        isHome: m.is_home,
      });
    }
  }
  result.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return result;
}

export function AgendaView({
  eventsByDay,
  rangeStartIso,
  rangeEndIso,
  emptyMessage = "Tu semana en el club. Si convocan a tu hijo, aparecerá aquí. Si no, descansas.",
  activeProfileId,
  showAttendance,
  userAttendanceBySession,
}: AgendaViewProps) {
  const events = flattenEvents(eventsByDay, rangeStartIso, rangeEndIso);
  const now = new Date();

  const groups = new Map<string, FlatEvent[]>();
  for (const ev of events) {
    const list = groups.get(ev.dayIso) ?? [];
    list.push(ev);
    groups.set(ev.dayIso, list);
  }

  const dayKeys = Array.from(groups.keys()).sort();

  return (
    <div className="flex flex-col gap-3">
      {dayKeys.length === 0 ? (
        <CalendarEmptyState
          message={emptyMessage}
          icon={<Calendar className="h-5 w-5" />}
          cta={
            activeProfileId
              ? { href: `/calendar` as Route, label: "Volver al calendario" }
              : undefined
          }
        />
      ) : null}
      {dayKeys.map((dayIso) => {
        const dayEvents = groups.get(dayIso) ?? [];
        const isPast = new Date(dayIso) < new Date(now.toDateString());
        return (
          <section
            key={dayIso}
            aria-labelledby={`day-${dayIso}`}
            className="rounded-lg border border-ink-300 bg-paper/50 p-3"
          >
            <h3
              id={`day-${dayIso}`}
              className="mb-2 flex items-center gap-2 font-display text-base font-bold text-brand-deep"
            >
              {formatLongDate(dayIso)}
              {isPast ? (
                <span className="inline-flex h-5 items-center rounded-full bg-ink-300 px-2 text-[10px] font-bold uppercase tracking-wider text-ink-900">
                  Pasado
                </span>
              ) : null}
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-ink-600">
                {dayEvents.length} evento{dayEvents.length === 1 ? "" : "s"}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {dayEvents.map((ev) => (
                <CalendarEventCard
                  key={ev.id}
                  event={{
                    id: ev.id,
                    kind: ev.kind,
                    scheduled_at: ev.scheduled_at,
                    title: ev.title,
                    team_label: ev.team_label,
                    team_color: ev.team_color,
                    cancelled: ev.cancelled,
                    status: ev.status,
                    duration_minutes: ev.duration_minutes || undefined,
                    location: ev.location,
                    competition_type: ev.competition_type,
                    opponent: ev.opponent || undefined,
                  }}
                  href={ev.kind === "match" ? `/matches/${ev.id}` : "/calendar"}
                  isPast={isPast}
                  showAttendance={showAttendance && ev.kind === "training"}
                  userAttendance={userAttendanceBySession?.get(ev.id) ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

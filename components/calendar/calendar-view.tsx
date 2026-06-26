"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  addMonths,
  currentYearMonth,
  monthLabel,
  type YearMonth,
} from "@/lib/domain/calendar";
import type { CalendarData } from "@/server/queries/calendar";

import { EventSheet } from "./event-sheet";
import { MonthView } from "./month-view";

export interface CalendarViewTeam {
  id: string;
  label: string;
  color: string;
}

export interface CalendarViewProps {
  teams: CalendarViewTeam[];
  defaultTeamId: string | null;
  eventsByDay: CalendarData;
  isCoach: boolean;
  isAdmin: boolean;
  activeProfileId: string;
}

export function CalendarView({
  teams,
  defaultTeamId,
  eventsByDay,
  isCoach,
  isAdmin,
  activeProfileId,
}: CalendarViewProps) {
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());
  const [teamFilter, setTeamFilter] = useState<string>(defaultTeamId ?? "");
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    if (!teamFilter) return eventsByDay;
    const out: CalendarData = new Map();
    for (const [iso, day] of eventsByDay) {
      const trainings = day.trainings.filter((t) => t.team_id === teamFilter);
      const matches = day.matches.filter((m) => m.team_id === teamFilter);
      if (trainings.length > 0 || matches.length > 0) {
        out.set(iso, { trainings, matches });
      }
    }
    return out;
  }, [eventsByDay, teamFilter]);

  const selectedDay = selectedIso ? (filteredEvents.get(selectedIso) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setYearMonth(addMonths(yearMonth, -1))}
            aria-label="Mes anterior"
          >
            ←
          </Button>
          <span className="font-display text-lg font-bold text-brand-deep">
            {monthLabel(yearMonth)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setYearMonth(addMonths(yearMonth, 1))}
            aria-label="Mes siguiente"
          >
            →
          </Button>
        </div>
        {teams.length > 0 ? (
          <div className="flex w-full flex-col gap-1 sm:w-56">
            <label
              htmlFor="calendar-team-filter"
              className="text-xs font-semibold uppercase tracking-wider text-ink-600"
            >
              Equipo
            </label>
            <Select
              id="calendar-team-filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">Todos mis equipos</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <MonthView
        year={yearMonth.year}
        month={yearMonth.month}
        eventsByDay={filteredEvents}
        onDayClick={(iso) => {
          setSelectedIso(iso);
          setOpen(true);
        }}
        selectedIso={selectedIso ?? undefined}
      />

      <EventSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSelectedIso(null);
        }}
        iso={selectedIso}
        day={selectedDay}
        isCoach={isCoach}
        isAdmin={isAdmin}
        activeProfileId={activeProfileId}
      />
    </div>
  );
}

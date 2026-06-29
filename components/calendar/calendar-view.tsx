"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Grid3x3, Calendar as CalendarIcon, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import {
  addDaysIso,
  addMonths,
  currentYearMonth,
  daysInMonth,
  isoDateFromDate,
  monthLabel,
  type YearMonth,
} from "@/lib/domain/calendar";
import type { CalendarData } from "@/server/queries/calendar";

import { AgendaView } from "./agenda-view";
import { EventSheet } from "./event-sheet";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";

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
  availabilityByDay: Map<string, boolean>;
  userAttendanceBySession?: Map<string, boolean>;
  showAttendance?: boolean;
}

type ViewMode = "month" | "week" | "agenda";

function startOfWeekIso(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysIso(isoDateFromDate(d), diff);
}

export function CalendarView({
  teams,
  defaultTeamId,
  eventsByDay,
  isCoach,
  isAdmin,
  activeProfileId,
  availabilityByDay,
  userAttendanceBySession,
  showAttendance,
}: CalendarViewProps) {
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());
  const [weekStartIso, setWeekStartIso] = useState<string>(() => startOfWeekIso(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("month");
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

  const agendaStartIso = isoDateFromDate(new Date(yearMonth.year, yearMonth.month, 1));
  const agendaEndIso = isoDateFromDate(
    new Date(yearMonth.year, yearMonth.month + 1, daysInMonth(yearMonth.year, yearMonth.month)),
  );

  function goPrev() {
    if (viewMode === "month") {
      setYearMonth(addMonths(yearMonth, -1));
    } else if (viewMode === "week") {
      setWeekStartIso(addDaysIso(weekStartIso, -7));
    } else {
      setYearMonth(addMonths(yearMonth, -1));
    }
  }

  function goNext() {
    if (viewMode === "month") {
      setYearMonth(addMonths(yearMonth, 1));
    } else if (viewMode === "week") {
      setWeekStartIso(addDaysIso(weekStartIso, 7));
    } else {
      setYearMonth(addMonths(yearMonth, 1));
    }
  }

  function goToday() {
    const today = new Date();
    setYearMonth({ year: today.getFullYear(), month: today.getMonth() });
    setWeekStartIso(startOfWeekIso(today));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={goPrev}
            aria-label="Anterior"
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[140px] text-center font-display text-base font-extrabold text-pool-deep">
            {viewMode === "week"
              ? `Semana del ${weekStartIso}`
              : monthLabel(yearMonth)}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={goNext}
            aria-label="Siguiente"
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="ml-1 h-9 text-xs font-bold"
          >
            Hoy
          </Button>
        </div>
        <div
          role="tablist"
          aria-label="Modo de vista"
          className="inline-flex h-10 w-full items-center rounded-md border border-ink-300 bg-paper p-0.5 sm:w-auto"
        >
          {[
            { id: "month" as const, Icon: Grid3x3, label: "Mes" },
            { id: "week" as const, Icon: CalendarIcon, label: "Semana" },
            { id: "agenda" as const, Icon: List, label: "Agenda" },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={viewMode === id}
              onClick={() => setViewMode(id)}
              className={cn(
                "inline-flex h-9 min-h-9 flex-1 items-center justify-center gap-1 rounded text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue sm:flex-initial sm:px-3",
                viewMode === id
                  ? "bg-pool-deep text-paper"
                  : "text-ink-600 hover:text-pool-deep",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {teams.length > 0 ? (
        <div className="flex items-center gap-2">
          <label
            htmlFor="calendar-team-filter"
            className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
          >
            Equipo
          </label>
          <Select
            id="calendar-team-filter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-9 text-sm"
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

      {viewMode === "month" ? (
        <MonthView
          year={yearMonth.year}
          month={yearMonth.month}
          eventsByDay={filteredEvents}
          onDayClick={(iso) => {
            setSelectedIso(iso);
            setOpen(true);
          }}
          selectedIso={selectedIso ?? undefined}
          availabilityByDay={availabilityByDay}
        />
      ) : viewMode === "week" ? (
        <WeekView
          startIso={weekStartIso}
          eventsByDay={filteredEvents}
          availabilityByDay={availabilityByDay}
          userAttendanceBySession={userAttendanceBySession}
          showAttendance={showAttendance}
          onDayClick={(iso) => {
            setSelectedIso(iso);
            setOpen(true);
          }}
          onEventClick={() => {
            setSelectedIso(null);
            setOpen(true);
          }}
          selectedIso={selectedIso ?? undefined}
        />
      ) : (
        <AgendaView
          eventsByDay={filteredEvents}
          rangeStartIso={agendaStartIso}
          rangeEndIso={agendaEndIso}
          activeProfileId={activeProfileId}
          showAttendance={showAttendance}
          userAttendanceBySession={userAttendanceBySession}
          emptyMessage="Tu mes en el club. Si convocan a tu hijo, aparecerá aquí. Si no, descansas."
        />
      )}

      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--pool-blue)" }}
          />
          Entreno
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--ball-gold)" }}
          />
          Partido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--goggle-red)" }}
          />
          Cancelado
        </span>
      </div>

      <EventSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSelectedIso(null);
        }}
        iso={selectedIso}
        day={selectedDay}
        isCoach={isCoach || isAdmin}
        isAdmin={isAdmin}
        activeProfileId={activeProfileId}
      />
    </div>
  );
}

void (0 as unknown as Date);

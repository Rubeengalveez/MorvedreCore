"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import {
  addDaysIso,
  addMonths,
  currentYearMonth,
  daysInMonth,
  monthLabel,
  weekdayShort,
  type YearMonth,
} from "@/lib/domain/calendar";
import type { CalendarData } from "@/server/queries/calendar";
import type { Tables } from "@/types/database";

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
}

type ViewMode = "month" | "week";

function startOfWeekIso(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysIso(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    diff,
  );
}

export function CalendarView({
  teams,
  defaultTeamId,
  eventsByDay,
  isCoach,
  isAdmin,
  activeProfileId,
  availabilityByDay,
}: CalendarViewProps) {
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());
  const [weekStartIso, setWeekStartIso] = useState<string>(() =>
    startOfWeekIso(new Date()),
  );
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
  const filteredAvailability = useMemo(() => {
    if (!teamFilter) return availabilityByDay;
    const out = new Map<string, boolean>();
    for (const [iso, val] of availabilityByDay) {
      out.set(iso, val);
    }
    return out;
  }, [availabilityByDay, teamFilter]);

  function goPrev() {
    if (viewMode === "month") {
      setYearMonth(addMonths(yearMonth, -1));
    } else {
      setWeekStartIso(addDaysIso(weekStartIso, -7));
    }
  }

  function goNext() {
    if (viewMode === "month") {
      setYearMonth(addMonths(yearMonth, 1));
    } else {
      setWeekStartIso(addDaysIso(weekStartIso, 7));
    }
  }

  function goToday() {
    const today = new Date();
    setYearMonth({ year: today.getFullYear(), month: today.getMonth() });
    setWeekStartIso(startOfWeekIso(today));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={goPrev}
            aria-label={viewMode === "month" ? "Mes anterior" : "Semana anterior"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-display text-lg font-bold text-brand-deep">
            {viewMode === "month"
              ? monthLabel(yearMonth)
              : `Semana del ${weekStartIso}`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={goNext}
            aria-label={viewMode === "month" ? "Mes siguiente" : "Semana siguiente"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="ml-1"
          >
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Modo de vista"
            className="inline-flex h-9 items-center rounded-md border border-ink-300 bg-paper p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "month"}
              onClick={() => setViewMode("month")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-semibold transition-colors",
                viewMode === "month"
                  ? "bg-brand-blue text-paper"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              Mes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "week"}
              onClick={() => setViewMode("week")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-semibold transition-colors",
                viewMode === "week"
                  ? "bg-brand-blue text-paper"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Semana
            </button>
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
      </div>

      {viewMode === "month" ? (
        <MonthView
          year={yearMonth.year}
          month={yearMonth.month}
          eventsByDay={filteredEvents}
          availabilityByDay={filteredAvailability}
          onDayClick={(iso) => {
            setSelectedIso(iso);
            setOpen(true);
          }}
          selectedIso={selectedIso ?? undefined}
        />
      ) : (
        <WeekView
          startIso={weekStartIso}
          eventsByDay={filteredEvents}
          availabilityByDay={filteredAvailability}
          onDayClick={(iso) => {
            setSelectedIso(iso);
            setOpen(true);
          }}
          onEventClick={(kind, id) => {
            setSelectedIso(null);
            if (kind === "match") {
              window.location.href = `/matches/${id}`;
            }
          }}
          selectedIso={selectedIso ?? undefined}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--brand-blue)" }}
          />
          Entreno
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--brand-ball)" }}
          />
          Partido (liga/copa)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--brand-action)" }}
          />
          Torneo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--danger)" }}
          />
          Cancelado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-ink-300 ring-1 ring-ink-600"
          />
          No disponible
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
        isCoach={isCoach}
        isAdmin={isAdmin}
        activeProfileId={activeProfileId}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
} from "lucide-react";

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
  todayIso,
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
  const initialTeamFilter = teams.length === 1 ? (defaultTeamId ?? teams[0]?.id ?? "") : "";
  const [teamFilter, setTeamFilter] = useState<string>(initialTeamFilter);
  const [selectedIso, setSelectedIso] = useState<string>(() => todayIso());
  const [open, setOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    if (!teamFilter) return eventsByDay;
    const out: CalendarData = new Map();
    for (const [iso, day] of eventsByDay) {
      const trainings = day.trainings.filter((t) => t.team_id === teamFilter);
      const matches = day.matches.filter((m) => m.team_id === teamFilter);
      if (trainings.length > 0 || matches.length > 0) out.set(iso, { trainings, matches });
    }
    return out;
  }, [eventsByDay, teamFilter]);

  const selectedDay = selectedIso ? (filteredEvents.get(selectedIso) ?? null) : null;
  const agendaStartIso = isoDateFromDate(new Date(yearMonth.year, yearMonth.month, 1));
  const agendaEndIso = isoDateFromDate(
    new Date(yearMonth.year, yearMonth.month + 1, daysInMonth(yearMonth.year, yearMonth.month)),
  );

  const monthOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const today = new Date();
    for (let i = -6; i <= 6; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
      list.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return list;
  }, []);

  function updateSelectedDayOnMonthNav(newYm: YearMonth) {
    const dayToSelect = Math.min(
      new Date(selectedIso).getDate(),
      daysInMonth(newYm.year, newYm.month),
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    setSelectedIso(`${newYm.year}-${pad(newYm.month + 1)}-${pad(dayToSelect)}`);
  }

  function goPrev() {
    if (viewMode === "week") {
      setWeekStartIso(addDaysIso(weekStartIso, -7));
      return;
    }
    const nextYm = addMonths(yearMonth, -1);
    setYearMonth(nextYm);
    updateSelectedDayOnMonthNav(nextYm);
  }

  function goNext() {
    if (viewMode === "week") {
      setWeekStartIso(addDaysIso(weekStartIso, 7));
      return;
    }
    const nextYm = addMonths(yearMonth, 1);
    setYearMonth(nextYm);
    updateSelectedDayOnMonthNav(nextYm);
  }

  function goToday() {
    const today = new Date();
    setYearMonth({ year: today.getFullYear(), month: today.getMonth() });
    setWeekStartIso(startOfWeekIso(today));
    setSelectedIso(todayIso());
  }

  const navLabel =
    viewMode === "week"
      ? `Semana ${weekStartIso.slice(8, 10)}/${weekStartIso.slice(5, 7)}`
      : monthLabel(yearMonth);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-ink-300 bg-paper-card shadow-elev-1 rounded-2xl border p-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div
            role="tablist"
            aria-label="Modo de vista"
            className="bg-paper-sunk grid min-h-12 grid-cols-3 rounded-xl p-1"
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
                  "focus-visible:ring-pool-blue inline-flex min-h-10 touch-manipulation items-center justify-center gap-1 rounded-lg px-1 text-xs font-extrabold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
                  viewMode === id ? "bg-pool-deep text-paper shadow-elev-1" : "text-ink-600",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={goToday}
            className="min-h-12 rounded-xl px-4 text-sm font-extrabold"
          >
            Hoy
          </Button>
        </div>

        {teams.length > 1 ? (
          <Select
            id="calendar-team-filter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="border-ink-300 bg-paper mt-2 min-h-12 w-full rounded-xl border px-3 text-sm font-semibold"
          >
            <option value="">Todos mis equipos</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Anterior"
            className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue hover:bg-pool-foam flex min-h-12 min-w-12 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="relative min-w-0 flex-1">
            <div className="bg-paper-sunk flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-3">
              <span className="font-display text-pool-deep truncate text-base font-extrabold">
                {navLabel}
              </span>
              <ChevronDown className="text-ink-600 h-4 w-4 shrink-0" />
            </div>
            <select
              value={`${yearMonth.year}-${yearMonth.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                if (y != null && m != null) {
                  const newYm = { year: y, month: m };
                  setYearMonth(newYm);
                  updateSelectedDayOnMonthNav(newYm);
                }
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              title="Seleccionar mes"
              aria-label="Seleccionar mes"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Siguiente"
            className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue hover:bg-pool-foam flex min-h-12 min-w-12 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="border-ink-300 bg-paper-card shadow-elev-1 rounded-2xl border p-2 sm:p-3">
        {viewMode === "month" ? (
          <MonthView
            year={yearMonth.year}
            month={yearMonth.month}
            eventsByDay={filteredEvents}
            onDayClick={(iso) => {
              setSelectedIso(iso);
              setOpen(true);
            }}
            selectedIso={selectedIso}
            availabilityByDay={availabilityByDay}
          />
        ) : viewMode === "week" ? (
          <WeekView
            startIso={weekStartIso}
            eventsByDay={filteredEvents}
            availabilityByDay={availabilityByDay}
            userAttendanceBySession={userAttendanceBySession}
            showAttendance={showAttendance}
            onDayClick={setSelectedIso}
            onEventClick={(kind, id) => {
              const dayIso = Array.from(filteredEvents.entries()).find(([, dayEvents]) =>
                kind === "training"
                  ? dayEvents.trainings.some((t) => t.id === id)
                  : dayEvents.matches.some((m) => m.id === id),
              )?.[0];
              if (dayIso) setSelectedIso(dayIso);
              setOpen(true);
            }}
            selectedIso={selectedIso}
            isCoach={isCoach}
            isAdmin={isAdmin}
            activeProfileId={activeProfileId}
          />
        ) : (
          <AgendaView
            eventsByDay={filteredEvents}
            rangeStartIso={agendaStartIso}
            rangeEndIso={agendaEndIso}
            activeProfileId={activeProfileId}
            showAttendance={showAttendance}
            userAttendanceBySession={userAttendanceBySession}
            emptyMessage="Tu mes en el club. Si hay convocatoria, aparece aquí. Si no, descansas."
          />
        )}
      </div>

      <div className="text-ink-600 flex flex-wrap items-center gap-3 px-1 text-xs font-bold">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="bg-pool-blue h-2 w-2 rounded-full" />
          Entreno
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="bg-ball-gold h-2 w-2 rounded-full" />
          Partido
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="bg-goggle-red h-2 w-2 rounded-full" />
          Cancelado
        </span>
      </div>

      <EventSheet
        open={open}
        onOpenChange={setOpen}
        iso={selectedIso}
        day={selectedDay}
        isCoach={isCoach || isAdmin}
        isAdmin={isAdmin}
        activeProfileId={activeProfileId}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Loader2,
} from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import {
  addMonths,
  formatLongDate,
  formatTimeOfDay,
  monthLabel,
  todayIso,
  type YearMonth,
} from "@/lib/domain/calendar";
import {
  calendarMonthKey,
  calendarMonth,
  calendarReturnParams,
  calendarAttendanceStatus,
  groupCalendarTrainings,
} from "@/lib/domain/calendar-presentation";
import type { CalendarData } from "@/server/queries/calendar";
import { CalendarKey } from "./calendar-key";
import { EventSheet } from "./event-sheet";
import { MonthView } from "./month-view";

export interface CalendarViewTeam {
  id: string;
  label: string;
  color: string;
}
export interface CalendarViewProps {
  teams: CalendarViewTeam[];
  people: Array<{ id: string; name: string }>;
  player: string;
  team: string;
  yearMonth: YearMonth;
  eventsByDay: CalendarData;
  initialDay?: string;
  origin?: string;
  notificationId?: string;
  canManageAttendance?: boolean;
}
const control =
  "border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 bg-blue-50 px-2 text-sm font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2";

export function CalendarView({
  teams,
  people,
  player,
  team,
  yearMonth,
  eventsByDay,
  initialDay,
  origin,
  notificationId,
  canManageAttendance = false,
}: CalendarViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const month = calendarMonthKey(yearMonth);
  const today = todayIso();
  const [selectedIso, setSelectedIso] = useState(
    initialDay?.startsWith(month) ? initialDay : today.startsWith(month) ? today : `${month}-01`,
  );
  const [open, setOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [pickedMonth, setPickedMonth] = useState(month);
  const [monthError, setMonthError] = useState<string | null>(null);
  function navigate(next: { month?: string; player?: string; team?: string }) {
    const params = new URLSearchParams({
      month: next.month ?? month,
      player: next.player ?? player,
    });
    const nextTeam = next.team ?? team;
    if (nextTeam) params.set("team", nextTeam);
    if (origin === "dashboard" || origin === "notification") params.set("from", origin);
    if (origin === "notification" && notificationId) params.set("notificationId", notificationId);
    startTransition(() => router.replace(`/calendar?${params}` as Route, { scroll: false }));
  }
  const selected = eventsByDay.get(selectedIso);
  const day = selected
    ? { ...selected, trainings: groupCalendarTrainings(selected.trainings) }
    : null;
  const returnParams = calendarReturnParams(month, player, team, selectedIso);
  const activities = [
    ...(day?.trainings ?? []).map((event) => ({
      scheduledAt: event.scheduled_at,
      label: event.cancelled ? "Entrenamiento cancelado" : "Entrenamiento",
    })),
    ...(day?.matches ?? []).map((event) => ({
      scheduledAt: event.scheduled_at,
      label:
        event.status === "cancelled"
          ? "Partido cancelado"
          : event.status === "postponed"
            ? "Partido aplazado"
            : "Partido",
    })),
  ].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const attendance = calendarAttendanceStatus(day?.trainings ?? []);
  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      <header className="flex min-h-12 items-center gap-2.5 px-1">
        <span className="bg-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="text-pool-deep flex-1 text-2xl font-extrabold">Calendario</h1>
        {canManageAttendance && (
          <Link
            href={`/attendance?${returnParams}` as Route}
            className="text-pool-blue focus-visible:outline-pool-blue inline-flex min-h-12 shrink-0 items-center rounded-lg px-1 text-sm font-extrabold whitespace-nowrap focus-visible:outline-2"
          >
            Pasar lista
          </Link>
        )}
      </header>
      {(people.length > 1 || teams.length > 1) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {people.length > 1 && (
            <label className="relative min-w-0">
              <span className="sr-only">Calendario de</span>
              <select
                disabled={pending}
                value={player}
                onChange={(event) => navigate({ player: event.target.value, team: "" })}
                className={`${control} w-full appearance-none pr-9`}
              >
                <option value="all">Toda la familia</option>
                {people.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="text-pool-blue pointer-events-none absolute top-4 right-3 h-4 w-4"
                aria-hidden="true"
              />
            </label>
          )}
          {teams.length > 1 && (
            <label className="relative min-w-0">
              <span className="sr-only">Filtrar por equipo</span>
              <select
                disabled={pending}
                value={team}
                onChange={(event) => navigate({ team: event.target.value })}
                className={`${control} w-full appearance-none pr-9`}
              >
                <option value="">Todos los equipos</option>
                {teams.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="text-pool-blue pointer-events-none absolute top-4 right-3 h-4 w-4"
                aria-hidden="true"
              />
            </label>
          )}
        </div>
      )}
      <section
        className="border-pool-deep/75 overflow-hidden rounded-2xl border-2 bg-white"
        aria-label="Calendario mensual"
      >
        <div className="bg-pool-deep grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-1 px-1 text-white">
          <button
            type="button"
            disabled={pending || (yearMonth.year <= 2000 && yearMonth.month === 0)}
            onClick={() => navigate({ month: calendarMonthKey(addMonths(yearMonth, -1)) })}
            aria-label="Mes anterior"
            className="focus-visible:outline-ball-gold flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:outline-2"
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMonthOpen(true)}
            className="focus-visible:outline-ball-gold flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-base font-extrabold whitespace-nowrap focus-visible:outline-2"
          >
            <span aria-live="polite">{monthLabel(yearMonth)}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            disabled={pending || (yearMonth.year >= 2100 && yearMonth.month === 11)}
            onClick={() => navigate({ month: calendarMonthKey(addMonths(yearMonth, 1)) })}
            aria-label="Mes siguiente"
            className="focus-visible:outline-ball-gold flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:outline-2"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>
        <div className="p-1 sm:p-2">
          <MonthView
            year={yearMonth.year}
            month={yearMonth.month}
            eventsByDay={eventsByDay}
            selectedIso={selectedIso}
            onDayClick={(iso) => {
              if (!pending) {
                setSelectedIso(iso);
                setOpen(true);
              }
            }}
          />
        </div>
        <div
          role="status"
          className="text-pool-blue mt-2 flex min-h-6 items-center justify-center gap-1.5 px-2 pb-2 text-xs font-bold"
        >
          {pending ? (
            <>
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Cargando mes…
            </>
          ) : (
            <>
              <span className="bg-pool-blue rounded px-1 text-white">E</span> Entrenamiento{" "}
              <span className="bg-ball-gold text-pool-deep ml-2 rounded-full px-1">P</span> Partido
            </>
          )}
        </div>
      </section>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            month === today.slice(0, 7)
              ? setSelectedIso(today)
              : navigate({ month: today.slice(0, 7) })
          }
          className={`${control}`}
        >
          Hoy
        </button>
        <button type="button" onClick={() => setLegendOpen(true)} className={`${control}`}>
          <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" />
          Leyenda
        </button>
        <Link
          href={`/attendance/history?${returnParams}&month=${month}&player=${player}` as Route}
          className={`${control}`}
        >
          Asistencia
        </Link>
      </div>
      {!!people.length && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(true)}
          aria-label={`Ver ${formatLongDate(`${selectedIso}T12:00:00`)}: ${activities.length} actividades`}
          className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex min-h-20 w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-2 leading-5">
            <span className="flex items-center justify-between gap-2">
              <span className="text-base leading-6 font-extrabold whitespace-nowrap">
                {selectedIso === today && "Hoy · "}
                {formatLongDate(`${selectedIso}T12:00:00`).split(" de ")[0]}
              </span>
              {activities.length > 0 && (
                <span className="border-pool-deep/65 shrink-0 rounded-lg border bg-blue-50 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap">
                  {activities.length} {activities.length === 1 ? "actividad" : "actividades"}
                </span>
              )}
            </span>
            {activities[0] ? (
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-base font-extrabold tabular-nums whitespace-nowrap">
                  {formatTimeOfDay(activities[0].scheduledAt)}
                </span>
                <span>{activities[0].label}</span>
              </span>
            ) : (
              <span className="text-sm font-semibold">Sin entrenamientos ni partidos</span>
            )}
            {attendance && (
              <span
                className={`self-start rounded-lg border px-2 py-1 text-sm font-bold ${attendance === "present" ? "border-green-800 bg-green-50 text-green-900" : attendance === "absent" ? "border-red-800 bg-red-50 text-red-900" : "border-amber-800 bg-amber-50 text-amber-950"}`}
              >
                {attendance === "present"
                  ? "Asistió al entrenamiento"
                  : attendance === "absent"
                    ? "No asistió al entrenamiento"
                    : "Asistencia parcial o pendiente"}
              </span>
            )}
          </span>
          <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
      )}
      {!people.length && (
        <p className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-3 text-sm font-semibold">
          Tus actividades aparecerán cuando tengas un equipo asignado.
        </p>
      )}
      <EventSheet
        open={open}
        onOpenChange={setOpen}
        iso={selectedIso}
        day={day}
        returnParams={returnParams}
      />
      <ActaGuardSheet
        open={legendOpen}
        onOpenChange={setLegendOpen}
        context="Calendario"
        title="Cómo leer tu calendario"
        description="Significado de las actividades y de la asistencia registrada."
        icon="saved"
        actions={[]}
        body={<CalendarKey showAttendance />}
      />
      <ActaGuardSheet
        open={monthOpen}
        onOpenChange={setMonthOpen}
        context="Calendario"
        title="Ir a un mes"
        description="Elige el mes que quieres consultar."
        icon="saved"
        error={monthError}
        body={
          <label className="text-pool-deep flex flex-col gap-2 text-base font-extrabold">
            Mes y año
            <input
              type="month"
              min="2000-01"
              max="2100-12"
              value={pickedMonth}
              onInput={(event) => {
                setPickedMonth(event.currentTarget.value);
                setMonthError(null);
              }}
              onChange={(event) => {
                setPickedMonth(event.target.value);
                setMonthError(null);
              }}
              className="border-pool-deep/65 focus-visible:outline-pool-blue min-h-14 w-full rounded-xl border-2 bg-white px-3 text-base focus-visible:outline-2"
            />
          </label>
        }
        actions={[
          {
            label: "Ver este mes",
            tone: "primary",
            onClick: () => {
              if (calendarMonthKey(calendarMonth(pickedMonth)) !== pickedMonth) {
                setMonthError("Elige un mes válido.");
                return;
              }
              setMonthOpen(false);
              navigate({ month: pickedMonth });
            },
          },
        ]}
      />
    </div>
  );
}

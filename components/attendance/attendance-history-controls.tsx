"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { calendarMonth, calendarMonthKey } from "@/lib/domain/calendar-presentation";
import { monthLabel } from "@/lib/domain/calendar";
import { shiftMonthKey } from "@/lib/domain/attendance-history";
export function AttendanceHistoryControls({
  month,
  player,
  people,
  origin,
}: {
  month: string;
  player: string;
  people: Array<{ id: string; full_name: string }>;
  origin: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(month);
  const [error, setError] = useState<string | null>(null);
  function go(nextMonth = month, nextPlayer = player) {
    startTransition(() =>
      router.replace(
        `/attendance/history?month=${nextMonth}&player=${nextPlayer}${origin}` as Route,
        { scroll: false },
      ),
    );
  }
  return (
    <div className="grid gap-2" aria-busy={pending}>
      {people.length > 1 && (
        <label className="text-pool-deep text-sm font-extrabold">
          <span className="sr-only">Asistencia de</span>
          <select
            value={player}
            disabled={pending}
            onChange={(event) => go(month, event.target.value)}
            className="border-pool-deep/65 focus-visible:outline-pool-blue min-h-12 w-full rounded-xl border-2 bg-white px-3 text-base font-bold focus-visible:outline-2"
          >
            <option value="all">Toda la familia</option>
            {people.map((person) => (
              <option value={person.id} key={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="border-pool-deep bg-pool-deep grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-1 rounded-xl border-2 px-1 py-1 text-white">
        <button
          type="button"
          disabled={pending || month === "2000-01"}
          onClick={() => go(shiftMonthKey(month, -1))}
          aria-label="Mes anterior"
          className="focus-visible:outline-ball-gold flex h-12 w-12 items-center justify-center rounded-lg focus-visible:outline-2"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(true)}
          className="focus-visible:outline-ball-gold flex min-h-12 items-center justify-center gap-1 rounded-lg text-base font-extrabold whitespace-nowrap focus-visible:outline-2"
        >
          <span aria-live="polite">{monthLabel(calendarMonth(month))}</span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={pending || month === "2100-12"}
          onClick={() => go(shiftMonthKey(month, 1))}
          aria-label="Mes siguiente"
          className="focus-visible:outline-ball-gold flex h-12 w-12 items-center justify-center rounded-lg focus-visible:outline-2"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <ActaGuardSheet
        open={open}
        onOpenChange={setOpen}
        context="Asistencia"
        title="Ir a un mes"
        description="Elige el mes cuya asistencia quieres consultar."
        icon="saved"
        error={error}
        body={
          <label className="text-pool-deep flex flex-col gap-2 font-extrabold">
            Mes y año
            <input
              type="month"
              min="2000-01"
              max="2100-12"
              value={picked}
              onInput={(event) => {
                setPicked(event.currentTarget.value);
                setError(null);
              }}
              onChange={(event) => {
                setPicked(event.target.value);
                setError(null);
              }}
              className="border-pool-deep/65 min-h-14 w-full rounded-xl border-2 bg-white px-3 text-base"
            />
          </label>
        }
        actions={[
          {
            label: "Ver asistencia",
            tone: "primary",
            onClick: () => {
              if (calendarMonthKey(calendarMonth(picked)) !== picked) {
                setError("Elige un mes válido.");
                return;
              }
              setOpen(false);
              go(picked);
            },
          },
        ]}
      />
      <p
        role="status"
        className={pending ? "text-pool-blue text-center text-sm font-bold" : "sr-only"}
      >
        {pending ? "Cargando asistencia…" : "Asistencia cargada"}
      </p>
    </div>
  );
}

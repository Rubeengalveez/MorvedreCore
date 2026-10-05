"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { isDateKey } from "@/lib/domain/attendance-history";
import { shiftTrainingDate } from "@/lib/domain/training-management";

export function AttendanceDatePicker({
  selectedDay,
  isToday,
  origin,
  calendarContext = "",
}: {
  selectedDay: string;
  isToday: boolean;
  origin?: "profile-activity" | "dashboard" | "calendar";
  calendarContext?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pickedDay, setPickedDay] = useState(selectedDay);
  const [error, setError] = useState<string | null>(null);
  const label = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${selectedDay}T12:00:00Z`));
  function navigate(day: string) {
    startTransition(() =>
      router.replace(
        `/attendance?date=${day}${origin ? `&from=${origin}${calendarContext ? `&${calendarContext}` : ""}` : ""}` as Route,
        { scroll: false },
      ),
    );
  }
  return (
    <>
      <div
        aria-label="Fecha de los entrenamientos"
        aria-busy={pending}
        className="bg-pool-deep border-pool-deep grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center rounded-2xl border-2 px-1 py-1 text-white"
      >
        <button
          type="button"
          aria-label="Ver el día anterior"
          disabled={pending}
          onClick={() => navigate(shiftTrainingDate(selectedDay, -1))}
          className="focus-visible:outline-ball-gold flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:outline-2"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Elegir fecha: ${label}`}
          disabled={pending}
          onClick={() => {
            setPickedDay(selectedDay);
            setError(null);
            setOpen(true);
          }}
          className="focus-visible:outline-ball-gold flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-sm font-extrabold whitespace-nowrap capitalize focus-visible:outline-2"
        >
          <span>{isToday ? `Hoy · ${label}` : label}</span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Ver el día siguiente"
          disabled={pending}
          onClick={() => navigate(shiftTrainingDate(selectedDay, 1))}
          className="focus-visible:outline-ball-gold flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:outline-2"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <p role="status" className="sr-only">
        {pending ? "Cargando entrenamientos…" : "Fecha preparada"}
      </p>
      <ActaGuardSheet
        open={open}
        onOpenChange={setOpen}
        context="Pasar lista"
        title="Elegir día"
        description="Elige la fecha de los entrenamientos."
        icon="saved"
        error={error}
        actions={[
          {
            label: "Ver entrenamientos",
            tone: "primary",
            onClick: () => {
              if (!isDateKey(pickedDay)) {
                setError("Elige una fecha válida.");
                return;
              }
              setOpen(false);
              navigate(pickedDay);
            },
          },
        ]}
        body={
          <label className="text-pool-deep flex flex-col gap-2 font-extrabold">
            Fecha
            <input
              type="date"
              value={pickedDay}
              onInput={(event) => {
                setPickedDay(event.currentTarget.value);
                setError(null);
              }}
              onChange={(event) => {
                setPickedDay(event.target.value);
                setError(null);
              }}
              className="border-pool-deep/65 focus-visible:outline-pool-blue min-h-14 w-full rounded-xl border-2 bg-white px-3 text-base focus-visible:outline-2"
            />
          </label>
        }
      />
    </>
  );
}

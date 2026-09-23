"use client";

import { CalendarClock, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { updateTrainingSession } from "@/server/actions/admin";

import type { TrainingSessionRow } from "./training-sessions-list";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function TrainingSessionEditSheet({
  session,
  trigger,
}: {
  session: TrainingSessionRow;
  trigger: React.ReactNode;
}) {
  const initial = useMemo(() => {
    const start = timeFormatter.format(new Date(session.scheduled_at));
    return {
      date: dateFormatter.format(new Date(session.scheduled_at)),
      start,
      end: minutesToTime(timeToMinutes(start) + session.duration_minutes),
    };
  }, [session.duration_minutes, session.scheduled_at]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.start);
  const [endTime, setEndTime] = useState(initial.end);
  const [location, setLocation] = useState(session.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    if (!date || !startTime || !endTime || duration < 15) {
      setError("Revisa la fecha y las horas. La hora final debe ser posterior.");
      return;
    }

    startTransition(async () => {
      try {
        await updateTrainingSession({
          session_id: session.id,
          scheduled_at: new Date(`${date}T${startTime}:00`).toISOString(),
          duration_minutes: duration,
          location: location.trim() || null,
        });
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos guardar el cambio.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg" className="mx-auto max-w-xl">
        <SheetHeader>
          <span className="bg-pool-foam text-pool-blue mb-1 flex h-11 w-11 items-center justify-center rounded-xl">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </span>
          <SheetTitle>Editar solo este día</SheetTitle>
          <SheetDescription>
            El horario habitual no cambia. Esta modificación solo afecta a este entrenamiento.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form id={`edit-session-${session.id}`} onSubmit={save} className="space-y-5 py-2">
            {error ? (
              <Alert variant="danger" title="Revisa los datos">
                {error}
              </Alert>
            ) : null}
            <label className="block">
              <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Día</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Empieza</span>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </label>
              <label>
                <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Termina</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Lugar</span>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Piscina del Puerto"
              />
            </label>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button type="submit" form={`edit-session-${session.id}`} size="lg" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Guardando…" : "Guardar este día"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

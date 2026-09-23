"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

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
import { cn } from "@/lib/utils/cn";
import {
  resyncFutureTrainingSessionsAction,
  updateTrainingBlock,
  type Team,
  type TrainingBlockRow,
} from "@/server/actions/admin";

type TeamOption = Team & { season_label: string };

const WEEKDAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
] as const;

export function TrainingBlockFormSheet({
  teams,
  trigger,
  initial,
}: {
  teams: TeamOption[];
  defaultTeamId: string | null;
  defaultSeasonId: string | null;
  trigger: React.ReactNode;
  initial?: TrainingBlockRow | null;
}) {
  const [open, setOpen] = useState(false);
  const [weekdays, setWeekdays] = useState(initial?.weekdays ?? []);
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [startTime, setStartTime] = useState(initial?.start_time.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial?.end_time.slice(0, 5) ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const team = teams.find((item) => item.id === initial?.team_id);

  function toggleDay(day: number) {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!initial || weekdays.length === 0) {
      setError("Selecciona al menos un día.");
      return;
    }
    startTransition(async () => {
      try {
        await updateTrainingBlock(initial.id, {
          weekdays,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          location: location.trim() || null,
        });
        await resyncFutureTrainingSessionsAction(initial.id);
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos guardar el horario.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg" className="mx-auto max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar horario</SheetTitle>
          <SheetDescription>{team?.label ?? "Categoría"}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form
            id={`edit-block-${initial?.id ?? "new"}`}
            onSubmit={save}
            className="space-y-5 py-3"
          >
            {error ? (
              <Alert variant="danger" title="Revisa el horario">
                {error}
              </Alert>
            ) : null}
            <fieldset>
              <legend className="text-pool-deep mb-2 text-sm font-extrabold">Días</legend>
              <div className="grid grid-cols-7 gap-1" role="group" aria-label="Días del horario">
                {WEEKDAYS.map((day) => {
                  const selected = weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={day.label}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "focus-visible:ring-pool-blue flex min-h-12 min-w-0 items-center justify-center rounded-lg border text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                        selected
                          ? "border-pool-blue bg-pool-blue text-paper"
                          : "border-ink-300 text-ink-700",
                      )}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </fieldset>
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
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Desde</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label>
                <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Hasta</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Lugar</span>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} />
            </label>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button
            type="submit"
            form={`edit-block-${initial?.id ?? "new"}`}
            size="lg"
            disabled={pending}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Guardando…" : "Guardar horario"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

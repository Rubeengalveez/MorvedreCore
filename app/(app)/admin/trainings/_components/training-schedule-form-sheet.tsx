"use client";

import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { createTrainingSchedule, type Season, type Team } from "@/server/actions/admin";

type TeamOption = Team & { season_label: string };
type ScheduleGroup = { id: number; weekdays: number[]; startTime: string; endTime: string };

const WEEKDAYS = [
  { value: 1, short: "Lun", label: "Lunes" },
  { value: 2, short: "Mar", label: "Martes" },
  { value: 3, short: "Mié", label: "Miércoles" },
  { value: 4, short: "Jue", label: "Jueves" },
  { value: 5, short: "Vie", label: "Viernes" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 7, short: "Dom", label: "Domingo" },
] as const;

function freshGroup(id: number): ScheduleGroup {
  return { id, weekdays: [], startTime: "18:00", endTime: "19:30" };
}

export function TrainingScheduleFormSheet({
  seasons,
  teams,
  defaultTeamId,
  defaultSeasonId,
  trigger,
}: {
  seasons: Season[];
  teams: TeamOption[];
  defaultTeamId: string | null;
  defaultSeasonId: string | null;
  trigger: React.ReactNode;
}) {
  const season = useMemo(
    () => seasons.find((item) => item.id === defaultSeasonId) ?? seasons[0] ?? null,
    [defaultSeasonId, seasons],
  );
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? "");
  const [startDate, setStartDate] = useState(season?.start_date ?? "");
  const [endDate, setEndDate] = useState(season?.end_date ?? "");
  const [location, setLocation] = useState("");
  const [groups, setGroups] = useState<ScheduleGroup[]>([freshGroup(1)]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateGroup(id: number, patch: Partial<ScheduleGroup>) {
    setGroups((current) =>
      current.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    );
  }

  function toggleDay(group: ScheduleGroup, day: number) {
    updateGroup(group.id, {
      weekdays: group.weekdays.includes(day)
        ? group.weekdays.filter((value) => value !== day)
        : [...group.weekdays, day].sort((a, b) => a - b),
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!teamId || !startDate || !endDate || groups.some((group) => group.weekdays.length === 0)) {
      setError("Completa las fechas y selecciona al menos un día en cada horario.");
      return;
    }
    startTransition(async () => {
      try {
        await createTrainingSchedule({
          team_id: teamId,
          label: "Horario habitual",
          start_date: startDate,
          end_date: endDate,
          location: location.trim() || null,
          kind: "water",
          replace_existing: replaceExisting,
          groups: groups.map((group) => ({
            weekdays: group.weekdays,
            start_time: group.startTime,
            end_time: group.endTime,
          })),
        });
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos crear los entrenamientos.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="full" className="mx-auto max-w-xl">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-[1.375rem]">Añadir entrenamientos</SheetTitle>
          <SheetDescription>Crea todas las sesiones del periodo seleccionado.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form id="training-schedule-form" onSubmit={submit} className="space-y-3 py-3">
            {error ? (
              <Alert variant="danger" title="Revisa el formulario">
                {error}
              </Alert>
            ) : null}

            <section className="bg-paper-card rounded-2xl p-4 shadow-[0_4px_16px_rgba(6,32,72,0.08)] ring-1 ring-pool-deep/10">
              <h3 className="text-pool-deep mb-3 text-base font-extrabold">
                Categoría y periodo
              </h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-pool-deep mb-1.5 block text-sm font-bold">Categoría</span>
                  <Select
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    className="h-12 min-h-12 rounded-xl text-base font-semibold focus-visible:ring-offset-0"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="text-pool-deep mb-1.5 block text-sm font-bold">Desde</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-12 min-h-12 rounded-xl text-base focus-visible:border-transparent focus-visible:ring-offset-0"
                  />
                </label>
                <label className="block">
                  <span className="text-pool-deep mb-1.5 block text-sm font-bold">Hasta</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-12 min-h-12 rounded-xl text-base focus-visible:border-transparent focus-visible:ring-offset-0"
                  />
                </label>
              </div>
            </section>

            <section className="bg-paper-card rounded-2xl p-4 shadow-[0_4px_16px_rgba(6,32,72,0.08)] ring-1 ring-pool-deep/10">
              <h3 className="text-pool-deep mb-3 text-base font-extrabold">Horario semanal</h3>
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <div
                    key={group.id}
                    className={cn(index > 0 && "bg-pool-deep/[0.03] rounded-xl p-3")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-pool-deep text-sm font-extrabold">
                        Horario {index + 1}
                      </span>
                      {groups.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setGroups((current) => current.filter((item) => item.id !== group.id))
                          }
                          className="text-goggle-red focus-visible:ring-goggle-red flex h-12 w-12 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                          aria-label={`Eliminar horario ${index + 1}`}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="mt-2 grid grid-cols-4 gap-1.5"
                      role="group"
                      aria-label={`Días del horario ${index + 1}`}
                    >
                      {WEEKDAYS.map((day) => {
                        const selected = group.weekdays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            aria-pressed={selected}
                            aria-label={day.label}
                            onClick={() => toggleDay(group, day.value)}
                            className={cn(
                              "focus-visible:ring-pool-blue flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                              selected
                                ? "border-pool-blue bg-pool-blue text-paper"
                                : "border-ink-300 bg-paper text-ink-700",
                            )}
                          >
                            <span>{day.short}</span>
                            {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label>
                        <span className="text-pool-deep mb-1.5 block text-sm font-bold">
                          Empieza
                        </span>
                        <Input
                          type="time"
                          value={group.startTime}
                          onChange={(event) =>
                            updateGroup(group.id, { startTime: event.target.value })
                          }
                          className="h-12 min-h-12 rounded-lg px-3 text-base"
                        />
                      </label>
                      <label>
                        <span className="text-pool-deep mb-1.5 block text-sm font-bold">
                          Termina
                        </span>
                        <Input
                          type="time"
                          value={group.endTime}
                          onChange={(event) =>
                            updateGroup(group.id, { endTime: event.target.value })
                          }
                          className="h-12 min-h-12 rounded-lg px-3 text-base"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => setGroups((current) => [...current, freshGroup(Date.now())])}
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Añadir otro horario
              </Button>
            </section>

            <section className="bg-paper-card rounded-2xl p-4 shadow-[0_4px_16px_rgba(6,32,72,0.08)] ring-1 ring-pool-deep/10">
              <h3 className="text-pool-deep mb-3 text-base font-extrabold">Detalles</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-pool-deep mb-1.5 block text-sm font-bold">Lugar</span>
                  <Input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Piscina del Puerto"
                    className="h-12 min-h-12 rounded-xl text-base focus-visible:border-transparent focus-visible:ring-offset-0"
                  />
                </label>
                <label className="border-pool-deep/10 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                    className="accent-pool-blue h-6 w-6 shrink-0"
                  />
                  <span className="text-pool-deep text-sm font-bold">
                    Sustituir sesiones existentes
                  </span>
                </label>
              </div>
            </section>
          </form>
        </SheetBody>
        <SheetFooter className="border-pool-deep/10">
          <Button type="submit" form="training-schedule-form" size="lg" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Creando…" : "Crear entrenamientos"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { CalendarRange, Clock3, Loader2, Plus, Trash2 } from "lucide-react";
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

interface ScheduleGroup {
  id: number;
  weekdays: number[];
  startTime: string;
  endTime: string;
}

const WEEKDAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
] as const;

const PRESETS = [
  { label: "L–V", days: [1, 2, 3, 4, 5] },
  { label: "L–X–V", days: [1, 3, 5] },
  { label: "M–J", days: [2, 4] },
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
  const currentSeason = useMemo(
    () => seasons.find((season) => season.id === defaultSeasonId) ?? seasons[0] ?? null,
    [defaultSeasonId, seasons],
  );
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? "");
  const [label, setLabel] = useState("Horario habitual");
  const [startDate, setStartDate] = useState(currentSeason?.start_date ?? "");
  const [endDate, setEndDate] = useState(currentSeason?.end_date ?? "");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState<"water" | "dry" | "physical" | "technical" | "mixed">("water");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [groups, setGroups] = useState<ScheduleGroup[]>([freshGroup(1)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateGroup(id: number, patch: Partial<ScheduleGroup>) {
    setGroups((current) =>
      current.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    );
  }

  function toggleDay(group: ScheduleGroup, day: number) {
    const weekdays = group.weekdays.includes(day)
      ? group.weekdays.filter((value) => value !== day)
      : [...group.weekdays, day].sort((a, b) => a - b);
    updateGroup(group.id, { weekdays });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createTrainingSchedule({
          team_id: teamId,
          label,
          start_date: startDate,
          end_date: endDate,
          location: location.trim() || null,
          kind,
          replace_existing: replaceExisting,
          groups: groups.map((group) => ({
            weekdays: group.weekdays,
            start_time: group.startTime,
            end_time: group.endTime,
          })),
        });
        setOpen(false);
        setGroups([freshGroup(Date.now())]);
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos crear el horario.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <span className="bg-pool-foam text-pool-blue mb-2 flex h-11 w-11 items-center justify-center rounded-xl">
            <CalendarRange className="h-5 w-5" aria-hidden="true" />
          </span>
          <SheetTitle>Crear horario semanal</SheetTitle>
          <SheetDescription>
            Configura toda una categoría de una vez. Puedes combinar varios horarios en el mismo
            periodo.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form id="training-schedule-form" onSubmit={handleSubmit} className="space-y-5 pb-3">
            {error ? (
              <Alert variant="danger" title="Revisa el horario">
                {error}
              </Alert>
            ) : null}

            <section className="border-ink-200 bg-paper-card rounded-2xl border p-4">
              <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                1 · Categoría y periodo
              </p>
              <div className="mt-3 space-y-4">
                <label className="block">
                  <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Equipo</span>
                  <Select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                    {seasons.map((season) => {
                      const seasonTeams = teams.filter((team) => team.season_id === season.id);
                      if (seasonTeams.length === 0) return null;
                      return (
                        <optgroup key={season.id} label={season.label}>
                          {seasonTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.label}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </Select>
                </label>
                <label className="block">
                  <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">
                    Nombre del horario
                  </span>
                  <Input value={label} onChange={(event) => setLabel(event.target.value)} />
                  <span className="text-ink-500 mt-1 block text-xs">
                    Por ejemplo: Horario habitual, Navidad o Verano.
                  </span>
                </label>
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <label>
                    <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">
                      Desde
                    </span>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">
                      Hasta
                    </span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                  2 · Días y horas
                </p>
                <p className="text-ink-600 mt-1 text-sm">
                  Agrupa los días que comparten la misma hora. Añade otro horario si cambian.
                </p>
              </div>
              {groups.map((group, index) => (
                <div key={group.id} className="border-ink-200 bg-paper-card rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-pool-deep font-extrabold">Horario {index + 1}</h3>
                    {groups.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setGroups((current) => current.filter((item) => item.id !== group.id))
                        }
                        className="text-goggle-red hover:bg-goggle-red/5 focus-visible:ring-goggle-red flex h-11 w-11 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                        aria-label={`Eliminar horario ${index + 1}`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    aria-label={`Días del horario ${index + 1}`}
                  >
                    {WEEKDAYS.map((day) => {
                      const active = group.weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          aria-label={day.label}
                          aria-pressed={active}
                          onClick={() => toggleDay(group, day.value)}
                          className={cn(
                            "focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border text-base font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                            active
                              ? "border-pool-blue bg-pool-deep text-paper"
                              : "border-ink-200 bg-paper text-ink-600",
                          )}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => updateGroup(group.id, { weekdays: [...preset.days] })}
                        className="border-ink-200 bg-paper text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue min-h-10 rounded-lg border px-3 text-xs font-extrabold focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <label>
                      <span className="text-pool-deep mb-1.5 flex items-center gap-1 text-sm font-extrabold">
                        <Clock3 className="h-4 w-4" aria-hidden="true" /> Empieza
                      </span>
                      <Input
                        type="time"
                        value={group.startTime}
                        onChange={(event) =>
                          updateGroup(group.id, { startTime: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">
                        Termina
                      </span>
                      <Input
                        type="time"
                        value={group.endTime}
                        onChange={(event) => updateGroup(group.id, { endTime: event.target.value })}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setGroups((current) => [...current, freshGroup(Date.now())])}
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Añadir otra hora
              </Button>
            </section>

            <section className="border-ink-200 bg-paper-card rounded-2xl border p-4">
              <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                3 · Detalles
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                <label>
                  <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Lugar</span>
                  <Input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Piscina del Puerto"
                  />
                </label>
                <label>
                  <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Tipo</span>
                  <Select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as typeof kind)}
                  >
                    <option value="water">Agua</option>
                    <option value="dry">Seco</option>
                    <option value="physical">Físico</option>
                    <option value="technical">Técnico</option>
                    <option value="mixed">Mixto</option>
                  </Select>
                </label>
              </div>
              <label className="border-ink-200 bg-paper mt-4 flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                  className="accent-pool-blue mt-0.5 h-5 w-5 shrink-0"
                />
                <span>
                  <span className="text-pool-deep block text-sm font-extrabold">
                    Sustituir el horario anterior en estas fechas
                  </span>
                  <span className="text-ink-600 mt-0.5 block text-xs leading-relaxed">
                    Úsalo para Navidad, verano o cambios temporales. Las listas ya guardadas se
                    respetan.
                  </span>
                </span>
              </label>
            </section>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button type="submit" form="training-schedule-form" size="lg" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Creando horario…" : "Crear horario y sesiones"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

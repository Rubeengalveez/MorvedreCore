"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { formatWeekdayLetter } from "@/lib/utils/format";
import { mapsUrlInputSchema } from "@/lib/domain/maps";
import {
  createTrainingBlock,
  generateSessionsFromBlockAction,
  resyncFutureTrainingSessionsAction,
  updateTrainingBlock,
  type Season,
  type Team,
  type TrainingBlockRow,
} from "@/server/actions/admin";

const KIND_OPTIONS = [
  { value: "water", label: "Agua" },
  { value: "dry", label: "Seco" },
  { value: "physical", label: "Físico" },
  { value: "technical", label: "Técnico" },
  { value: "mixed", label: "Mixto" },
] as const;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const formSchema = z.object({
  team_id: z.string().uuid("Selecciona un equipo."),
  label: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1, "Selecciona al menos un día."),
  start_date: z.string().min(1, "Fecha de inicio obligatoria."),
  end_date: z.string().min(1, "Fecha de fin obligatoria."),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora de inicio inválida."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fin inválida."),
  location: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  maps_url: mapsUrlInputSchema.optional(),
  kind: z.enum(["water", "dry", "physical", "technical", "mixed"]),
});

type FormValues = z.infer<typeof formSchema>;

type ActionState =
  { ok: true; blockId: string; generated: number } | { ok?: false; error: string } | null;

type TeamOption = Team & { season_label: string };

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const weekdaysRaw = formData.getAll("weekdays").map((v) => Number(v));
    const weekdays = weekdaysRaw.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
    const input = {
      team_id: String(formData.get("team_id") ?? ""),
      label: String(formData.get("label") ?? ""),
      weekdays,
      start_date: String(formData.get("start_date") ?? ""),
      end_date: String(formData.get("end_date") ?? ""),
      start_time: String(formData.get("start_time") ?? ""),
      end_time: String(formData.get("end_time") ?? ""),
      location: String(formData.get("location") ?? "") || null,
      maps_url: String(formData.get("maps_url") ?? "") || null,
      kind: String(formData.get("kind") ?? "water") as
        "water" | "dry" | "physical" | "technical" | "mixed",
    };
    const blockId = String(formData.get("block_id") ?? "");
    const block = blockId
      ? await updateTrainingBlock(blockId, input)
      : await createTrainingBlock(input);
    const generated = blockId
      ? await resyncFutureTrainingSessionsAction(block.id)
      : await generateSessionsFromBlockAction(block.id);
    return { ok: true, blockId: block.id, generated: generated.created };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos guardar." };
  }
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Guardando..." : label}
    </Button>
  );
}

function WeekdaysField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  function toggle(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((v) => v !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  }
  return (
    <div role="group" aria-label="Días de la semana" className="flex flex-wrap gap-2">
      {WEEKDAYS.map((d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={active}
            className={cn(
              "font-display focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex h-12 min-h-12 w-12 items-center justify-center rounded border text-base font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              active
                ? "border-pool-blue bg-pool-blue text-paper"
                : "border-ink-300 bg-paper text-ink-600 hover:border-pool-blue hover:text-pool-deep",
            )}
          >
            {formatWeekdayLetter(d)}
          </button>
        );
      })}
    </div>
  );
}

export interface TrainingBlockFormSheetProps {
  seasons: Season[];
  teams: TeamOption[];
  defaultTeamId: string | null;
  defaultSeasonId: string | null;
  trigger: React.ReactNode;
  initial?: TrainingBlockRow | null;
}

export function TrainingBlockFormSheet({
  seasons,
  teams,
  defaultTeamId,
  trigger,
  initial,
}: TrainingBlockFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();
  const isEdit = initial != null;

  const initialTeamId = initial?.team_id ?? defaultTeamId ?? teams[0]?.id ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team_id: initialTeamId,
      label: initial?.label ?? "",
      weekdays: initial?.weekdays ?? [],
      start_date: initial?.start_date ?? "",
      end_date: initial?.end_date ?? "",
      start_time: initial?.start_time?.slice(0, 5) ?? "",
      end_time: initial?.end_time?.slice(0, 5) ?? "",
      location: initial?.location ?? "",
      maps_url: initial?.maps_url ?? "",
      kind: (initial?.kind as FormValues["kind"]) ?? "water",
    },
  });

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      form.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    if (initial?.id) fd.append("block_id", initial.id);
    fd.append("team_id", values.team_id);
    fd.append("label", values.label);
    values.weekdays.forEach((d) => fd.append("weekdays", String(d)));
    fd.append("start_date", values.start_date);
    fd.append("end_date", values.end_date);
    fd.append("start_time", values.start_time);
    fd.append("end_time", values.end_time);
    fd.append("location", values.location ?? "");
    fd.append("maps_url", values.maps_url ?? "");
    fd.append("kind", values.kind);
    startTransition(() => {
      formAction(fd);
    });
  });

  const errorMessage = state && "error" in state ? state.error : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar bloque" : "Nuevo bloque de entrenamientos"}</SheetTitle>
          <SheetDescription>
            Define los días, horario y lugar. Al guardar, se generarán las sesiones
            correspondientes.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id="training-block-form"
              onSubmit={onSubmit}
              className="flex flex-col gap-5 pb-2"
              noValidate
            >
              {errorMessage ? (
                <Alert variant="danger" title="No pudimos guardar">
                  {errorMessage}
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={isEdit}
                      >
                        {seasons.map((s) => {
                          const seasonTeams = teams.filter((t) => t.season_id === s.id);
                          if (seasonTeams.length === 0) return null;
                          return (
                            <optgroup
                              key={s.id}
                              label={`${s.label}${s.is_current ? " · actual" : ""}`}
                            >
                              {seasonTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label} · {t.season_label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del bloque</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pretemporada"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weekdays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de la semana</FormLabel>
                    <FormControl>
                      <WeekdaysField value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Toca los días que se entrena en este bloque.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de fin</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Piscina del Puerto"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maps_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enlace de Google Maps (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="https://maps.app.goo.gl/..."
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Se copiará a todos los entrenamientos que genere este bloque.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {KIND_OPTIONS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label={isEdit ? "Guardar cambios" : "Crear y generar sesiones"} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

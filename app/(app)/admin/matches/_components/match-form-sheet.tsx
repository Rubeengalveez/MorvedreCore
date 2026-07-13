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
import { formatDateTimeLocal, parseDateTimeLocal } from "@/lib/utils/format";
import { createMatch, type Season, type Team } from "@/server/actions/admin";

const COMPETITION_OPTIONS = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Copa" },
  { value: "tournament", label: "Torneo" },
  { value: "friendly", label: "Amistoso" },
] as const;

const formSchema = z.object({
  team_id: z.string().uuid("Selecciona un equipo."),
  opponent: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  competition_type: z.enum(["league", "cup", "tournament", "friendly"]),
  is_home: z.boolean(),
  location: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  pool_name: z.string().trim().max(100, "Máximo 100 caracteres.").optional(),
  scheduled_at_local: z.string().min(1, "Fecha y hora obligatorias."),
  logistics_enabled: z.boolean(),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ActionState = { ok?: true; error?: string } | null;

type TeamOption = Team & { season_label: string };

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const localStr = String(formData.get("scheduled_at_local") ?? "");
    const dt = parseDateTimeLocal(localStr);
    if (!dt) {
      return { error: "Fecha u hora inválidas." };
    }
    const seasonId = String(formData.get("season_id") ?? "");
    if (!seasonId) {
      return { error: "Falta la temporada del partido." };
    }
    await createMatch({
      season_id: seasonId,
      team_id: String(formData.get("team_id") ?? ""),
      opponent: String(formData.get("opponent") ?? ""),
      competition_type: String(formData.get("competition_type") ?? "league") as
        "league" | "cup" | "tournament" | "friendly",
      is_home: formData.get("is_home") === "true",
      location: String(formData.get("location") ?? "") || undefined,
      pool_name: String(formData.get("pool_name") ?? "") || undefined,
      scheduled_at: dt.toISOString(),
      logistics_enabled: formData.get("logistics_enabled") === "true",
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    return { ok: true };
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

function Toggle({
  value,
  onChange,
  label,
  description,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-ink-900 text-sm font-semibold">{label}</span>
        {description ? <span className="text-ink-600 text-xs">{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={
          "focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none " +
          (value ? "bg-pool-blue" : "bg-ink-300")
        }
      >
        <span
          aria-hidden="true"
          className={
            "bg-paper inline-block h-5 w-5 rounded-full transition-transform " +
            (value ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}

export interface MatchFormSheetProps {
  seasons: Season[];
  teams: TeamOption[];
  defaultTeamId: string | null;
  defaultSeasonId: string | null;
  trigger: React.ReactNode;
}

export function MatchFormSheet({
  seasons,
  teams,
  defaultTeamId,
  defaultSeasonId,
  trigger,
}: MatchFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();

  const defaultTeam = defaultTeamId ? (teams.find((t) => t.id === defaultTeamId) ?? null) : null;
  const resolvedSeasonId = defaultSeasonId
    ? defaultSeasonId
    : defaultTeam
      ? defaultTeam.season_id
      : (seasons.find((s) => s.is_current)?.id ?? "");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team_id: defaultTeamId ?? teams[0]?.id ?? "",
      opponent: "",
      competition_type: "league",
      is_home: true,
      location: defaultTeam?.home_pool ?? "",
      pool_name: "",
      scheduled_at_local: formatDateTimeLocal(new Date()),
      logistics_enabled: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("season_id", resolvedSeasonId);
    fd.append("team_id", values.team_id);
    fd.append("opponent", values.opponent);
    fd.append("competition_type", values.competition_type);
    fd.append("is_home", values.is_home ? "true" : "false");
    if (values.location && values.location.trim() !== "") {
      fd.append("location", values.location);
    }
    if (values.pool_name && values.pool_name.trim() !== "") {
      fd.append("pool_name", values.pool_name);
    }
    fd.append("scheduled_at_local", values.scheduled_at_local);
    fd.append("logistics_enabled", values.logistics_enabled ? "true" : "false");
    if (values.notes && values.notes.trim() !== "") {
      fd.append("notes", values.notes);
    }
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Nuevo partido</SheetTitle>
          <SheetDescription>
            Programa un partido y empieza a montar la convocatoria.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id="match-form-new"
              onSubmit={onSubmit}
              className="flex flex-col gap-5 pb-2"
              noValidate
            >
              {state?.error ? (
                <Alert variant="danger" title="No pudimos guardar">
                  {state.error}
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
                      >
                        {seasons.map((s) => {
                          const seasonTeams = teams.filter((t) => t.season_id === s.id);
                          if (seasonTeams.length === 0) return null;
                          return (
                            <optgroup
                              key={s.id}
                              label={`${s.label}${s.is_current ? " (actual)" : ""}`}
                            >
                              {seasonTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="opponent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rival</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="CW Elche"
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
                  name="competition_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Competición</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          {COMPETITION_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_home"
                render={({ field }) => (
                  <FormItem>
                    <Toggle
                      value={field.value}
                      onChange={field.onChange}
                      label="Juegas en casa"
                      description="Si lo desactivas, el partido se juega fuera."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_at_local"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y hora</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lugar</FormLabel>
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
                  name="pool_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Piscina</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Piscina municipal"
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
              </div>

              <FormField
                control={form.control}
                name="logistics_enabled"
                render={({ field }) => (
                  <FormItem>
                    <Toggle
                      value={field.value}
                      onChange={field.onChange}
                      label="Activar logística"
                      description="Habilita la pestaña de logística (coches, viajes)."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        placeholder="Información útil para el equipo"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="border-ink-300 bg-paper text-ink-900 placeholder:text-ink-600/70 focus-visible:border-pool-blue focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex w-full rounded border px-4 py-3 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Crear partido" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

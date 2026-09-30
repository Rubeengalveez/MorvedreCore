"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, ClipboardPenLine, Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Route } from "next";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { Button } from "@/components/ui/button";
import { useActaBackGuard } from "@/components/matches/use-acta-back-guard";
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
import { formatDateTimeLocal, parseDateTimeLocal } from "@/lib/utils/format";
import { mapsUrlInputSchema } from "@/lib/domain/maps";
import { HOME_LEAGUE_LOCATION, HOME_LEAGUE_MAPS_URL } from "@/lib/domain/match-venue";
import { updateMatch, type MatchRow } from "@/server/actions/admin";

const COMPETITION_OPTIONS = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Copa" },
  { value: "tournament", label: "Torneo" },
  { value: "friendly", label: "Amistoso" },
] as const;

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Programado" },
  { value: "in_progress", label: "En juego" },
  { value: "played", label: "Jugado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "postponed", label: "Aplazado" },
] as const;

const formSchema = z.object({
  opponent: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  competition_type: z.enum(["league", "cup", "tournament", "friendly"]),
  status: z.enum(["scheduled", "in_progress", "played", "cancelled", "postponed"]),
  is_home: z.boolean(),
  location: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  maps_url: mapsUrlInputSchema.optional(),
  scheduled_at_local: z.string().min(1, "Fecha y hora obligatorias."),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button type="submit" size="lg" variant="deep" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Guardando..." : label}
    </Button>
  );
}

function VenueChoice({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <fieldset>
      <legend className="text-pool-deep mb-2 text-sm font-bold">¿Dónde se juega?</legend>
      <div className="grid grid-cols-2 gap-2">
        {[
          { home: true, label: "Local" },
          { home: false, label: "Visitante" },
        ].map((option) => (
          <label key={option.label} className="cursor-pointer">
            <input
              type="radio"
              name="match-venue"
              value={String(option.home)}
              checked={value === option.home}
              onChange={() => onChange(option.home)}
              className="peer sr-only"
            />
            <span className="border-pool-blue/70 bg-paper text-pool-deep peer-checked:border-pool-deep peer-checked:bg-pool-deep peer-checked:text-paper peer-focus-visible:outline-pool-blue flex min-h-14 items-center justify-center rounded-xl border-2 px-3 text-base font-extrabold peer-focus-visible:outline-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface MatchDetailsFormProps {
  match: MatchRow;
  teamLabel: string;
  backHref: Route;
  backLabel: string;
}

export function MatchDetailsForm({ match, teamLabel, backHref, backLabel }: MatchDetailsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipUnloadRef = useRef(false);
  const previousVenueRef = useRef(`${match.is_home}:${match.competition_type}`);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opponent: match.opponent,
      competition_type: match.competition_type as FormValues["competition_type"],
      status: match.status as FormValues["status"],
      is_home: match.is_home,
      location: match.location ?? "",
      maps_url: match.maps_url ?? "",
      scheduled_at_local: formatDateTimeLocal(new Date(match.scheduled_at)),
      notes: match.notes ?? "",
    },
  });

  const isHome = useWatch({ control: form.control, name: "is_home" });
  const competition = useWatch({ control: form.control, name: "competition_type" });

  useEffect(() => {
    const venue = `${isHome}:${competition}`;
    const changed = previousVenueRef.current !== venue;
    previousVenueRef.current = venue;
    if (isHome && competition === "league") {
      const location = form.getValues("location");
      if (changed || !location)
        form.setValue("location", HOME_LEAGUE_LOCATION, { shouldDirty: true });
      if (
        changed ||
        ((!location || location === HOME_LEAGUE_LOCATION) && !form.getValues("maps_url"))
      ) {
        form.setValue("maps_url", HOME_LEAGUE_MAPS_URL, { shouldDirty: true });
      }
    } else {
      if (form.getValues("location") === HOME_LEAGUE_LOCATION)
        form.setValue("location", "", { shouldDirty: true });
      if (form.getValues("maps_url") === HOME_LEAGUE_MAPS_URL)
        form.setValue("maps_url", "", { shouldDirty: true });
    }
  }, [isHome, competition, form]);

  const dirty = form.formState.isDirty;
  const leave = useActaBackGuard(() => {
    if (leaveOpen) setLeaveOpen(false);
    else requestLeave();
  }, true);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (skipUnloadRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function requestLeave() {
    if (pending) return;
    if (dirty) setLeaveOpen(true);
    else leave(backHref);
  }

  function save(values: FormValues) {
    setError(null);
    const dt = parseDateTimeLocal(values.scheduled_at_local);
    if (!dt) {
      setError("Fecha u hora inválidas.");
      return;
    }
    startTransition(async () => {
      try {
        await updateMatch(match.id, {
          opponent: values.opponent,
          competition_type: values.competition_type,
          status: values.status,
          is_home: values.is_home,
          location: values.location && values.location.trim() !== "" ? values.location : null,
          maps_url: values.maps_url && values.maps_url.trim() !== "" ? values.maps_url : null,
          pool_name: null,
          scheduled_at: dt.toISOString(),
          notes: values.notes && values.notes.trim() !== "" ? values.notes : null,
        });
        form.reset(values);
        skipUnloadRef.current = true;
        setLeaveOpen(false);
        leave(backHref);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar.");
      }
    });
  }

  const onSubmit = form.handleSubmit(save);

  return (
    <>
      <button
        type="button"
        onClick={requestLeave}
        className="text-pool-blue focus-visible:outline-pool-blue -ml-2 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold focus-visible:outline-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
      </button>
      <header className="bg-pool-deep text-paper shadow-elev-2 rounded-2xl px-4 py-4">
        <h1 className="font-display text-xl font-extrabold">Editar partido</h1>
        <p className="mt-1 text-sm font-semibold text-blue-100">
          {teamLabel} · {match.opponent}
        </p>
      </header>
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error ? (
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
          ) : null}

          <section className="bg-paper-card shadow-elev-1 flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <ClipboardPenLine className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-pool-deep font-display text-lg font-extrabold">
                Rival y competición
              </h2>
            </div>
            <FormField
              control={form.control}
              name="opponent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rival</FormLabel>
                  <FormControl>
                    <Input
                      className="border-pool-blue/70 min-h-14 rounded-xl border-2"
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
                name="competition_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competición</FormLabel>
                    <FormControl>
                      <Select
                        className="border-pool-blue/70 min-h-14 rounded-xl border-2"
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Select
                        className="border-pool-blue/70 min-h-14 rounded-xl border-2"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
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
                  <VenueChoice value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="bg-paper-card shadow-elev-1 flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-pool-deep font-display text-lg font-extrabold">Fecha y lugar</h2>
            </div>
            <FormField
              control={form.control}
              name="scheduled_at_local"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y hora</FormLabel>
                  <FormControl>
                    <Input
                      className="border-pool-blue/70 min-h-14 rounded-xl border-2"
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

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lugar</FormLabel>
                  <FormControl>
                    <Input
                      className="border-pool-blue/70 min-h-14 rounded-xl border-2"
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
                      className="border-pool-blue/70 min-h-14 rounded-xl border-2"
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
                    En Google Maps, toca Compartir y copia aquí el enlace de la piscina.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="bg-paper-card shadow-elev-1 flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-pool-deep font-display text-lg font-extrabold">
                  Indicaciones para el equipo
                </h2>
                <p className="text-ink-700 text-sm">Visible para jugadores y familias.</p>
              </div>
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="border-pool-blue/70 bg-paper text-ink-900 placeholder:text-ink-600 focus-visible:border-pool-blue focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex w-full rounded-xl border-2 px-4 py-3 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <SubmitButton label="Guardar cambios" pending={pending} />
        </form>
      </Form>
      <ActaGuardSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Cambios sin guardar"
        summary="Has cambiado los datos del partido"
        description="Guárdalos ahora o sal sin aplicar los cambios."
        context="Editar partido"
        icon="warning"
        pending={pending}
        error={error}
        actions={[
          {
            label: "Guardar y volver",
            tone: "primary",
            onClick: () =>
              void form.handleSubmit(save, () => {
                setLeaveOpen(false);
                setError("Revisa los campos marcados para guardar.");
              })(),
          },
          { label: "Seguir editando", tone: "secondary", onClick: () => setLeaveOpen(false) },
          {
            label: "Salir sin guardar",
            tone: "danger",
            onClick: () => {
              skipUnloadRef.current = true;
              setLeaveOpen(false);
              leave(backHref);
            },
          },
        ]}
      />
    </>
  );
}

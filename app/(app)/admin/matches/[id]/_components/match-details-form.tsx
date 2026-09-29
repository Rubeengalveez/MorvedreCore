"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, ClipboardPenLine, Loader2, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { formatDateTimeLocal, parseDateTimeLocal } from "@/lib/utils/format";
import { mapsUrlInputSchema } from "@/lib/domain/maps";
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
  pool_name: z.string().trim().max(100, "Máximo 100 caracteres.").optional(),
  scheduled_at_local: z.string().min(1, "Fecha y hora obligatorias."),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
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
          { home: true, label: "En casa" },
          { home: false, label: "Fuera" },
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
}

export function MatchDetailsForm({ match }: MatchDetailsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opponent: match.opponent,
      competition_type: match.competition_type as FormValues["competition_type"],
      status: match.status as FormValues["status"],
      is_home: match.is_home,
      location: match.location ?? "",
      maps_url: match.maps_url ?? "",
      pool_name: match.pool_name ?? "",
      scheduled_at_local: formatDateTimeLocal(new Date(match.scheduled_at)),
      notes: match.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setSuccess(false);
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
          pool_name: values.pool_name && values.pool_name.trim() !== "" ? values.pool_name : null,
          scheduled_at: dt.toISOString(),
          notes: values.notes && values.notes.trim() !== "" ? values.notes : null,
        });
        setSuccess(true);
        form.reset(values);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar.");
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error ? (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert variant="success" title="Cambios guardados">
            Los datos del partido se han actualizado.
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
              name="pool_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Piscina</FormLabel>
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
          </div>

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
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { formatDateTimeLocal, parseDateTimeLocal } from "@/lib/utils/format";
import { updateMatch, type MatchRow, type Team } from "@/server/actions/admin";

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
  pool_name: z.string().trim().max(100, "Máximo 100 caracteres.").optional(),
  scheduled_at_local: z.string().min(1, "Fecha y hora obligatorias."),
  logistics_enabled: z.boolean(),
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
          "focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative inline-flex h-12 w-14 shrink-0 cursor-pointer items-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none " +
          (value ? "bg-pool-blue" : "bg-ink-300")
        }
      >
        <span
          aria-hidden="true"
          className={
            "bg-paper inline-block h-6 w-6 rounded-lg transition-transform " +
            (value ? "translate-x-7" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}

export interface MatchDetailsFormProps {
  match: MatchRow;
  team: Pick<Team, "id" | "label" | "color">;
}

export function MatchDetailsForm({ match, team }: MatchDetailsFormProps) {
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
      pool_name: match.pool_name ?? "",
      scheduled_at_local: formatDateTimeLocal(new Date(match.scheduled_at)),
      logistics_enabled: match.logistics_enabled,
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
          pool_name: values.pool_name && values.pool_name.trim() !== "" ? values.pool_name : null,
          scheduled_at: dt.toISOString(),
          logistics_enabled: values.logistics_enabled,
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
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
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

        <div className="border-ink-300 bg-pool-foam/40 flex items-center gap-2 rounded-md border p-3 text-sm">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="text-pool-deep font-semibold">{team.label}</span>
          <span className="text-ink-600">· temporada</span>
        </div>

        <section className="border-ink-200 bg-paper-card flex flex-col gap-5 rounded-2xl border p-4 sm:p-5">
          <div>
            <h3 className="text-pool-deep font-extrabold">Partido</h3>
            <p className="text-ink-500 mt-0.5 text-sm">Rival, competición y situación actual.</p>
          </div>
          <FormField
            control={form.control}
            name="opponent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rival</FormLabel>
                <FormControl>
                  <Input
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
        </section>

        <section className="border-ink-200 bg-paper-card flex flex-col gap-5 rounded-2xl border p-4 sm:p-5">
          <div>
            <h3 className="text-pool-deep font-extrabold">Cuándo y dónde</h3>
            <p className="text-ink-500 mt-0.5 text-sm">Información que verá todo el equipo.</p>
          </div>
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
        </section>

        <section className="border-ink-200 bg-paper-card flex flex-col gap-5 rounded-2xl border p-4 sm:p-5">
          <div>
            <h3 className="text-pool-deep font-extrabold">Organización</h3>
            <p className="text-ink-500 mt-0.5 text-sm">Desplazamiento y notas para el grupo.</p>
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
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
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
        </section>

        <SubmitButton label="Guardar cambios" pending={pending} />
      </form>
    </Form>
  );
}

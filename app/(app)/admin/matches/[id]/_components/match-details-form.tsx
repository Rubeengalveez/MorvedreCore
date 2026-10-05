"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, Check, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { Route } from "next";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";

import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { useActaBackGuard } from "@/components/matches/use-acta-back-guard";
import {
  matchEditorSchema,
  matchFormPayload,
  type MatchEditorValues,
} from "@/lib/domain/admin-matches";
import { formatDateTimeLocal } from "@/lib/utils/format";
import { updateMatch, type MatchRow } from "@/server/actions/admin";

import {
  MatchIdentityFields,
  MatchLocationFields,
  MatchScheduleFields,
  MatchTextField,
  matchActionClass,
} from "../../_components/match-editor-fields";
import { useMatchVenue } from "../../_components/use-match-venue";

export interface MatchDetailsFormProps {
  match: MatchRow;
  teamLabel: string;
  backHref: Route;
  backLabel: string;
}

const panels = ["Datos", "Piscina", "Notas"];

export function MatchDetailsForm({ match, teamLabel, backHref, backLabel }: MatchDetailsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const skipUnloadRef = useRef(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const form = useForm<MatchEditorValues>({
    resolver: zodResolver(matchEditorSchema),
    defaultValues: {
      team_id: match.team_id ?? "",
      opponent: match.opponent,
      competition_type: match.competition_type as MatchEditorValues["competition_type"],
      status: match.status as MatchEditorValues["status"],
      is_home: match.is_home,
      location: match.location ?? match.pool_name ?? "",
      maps_url: match.maps_url ?? "",
      scheduled_at_local: formatDateTimeLocal(new Date(match.scheduled_at)),
      notes: match.notes ?? "",
    },
  });
  useMatchVenue(form);
  const dirty = form.formState.isDirty;
  const leave = useActaBackGuard(() => {
    if (leaveOpen) setLeaveOpen(false);
    else if (cancelOpen) setCancelOpen(false);
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

  function save(values: MatchEditorValues, confirmed = false) {
    if (!confirmed && values.status === "cancelled" && match.status !== "cancelled") {
      setLeaveOpen(false);
      setCancelOpen(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const payload = matchFormPayload(values);
        const venueChanged = values.location.trim() !== (match.location ?? match.pool_name ?? "");
        await updateMatch(match.id, {
          ...payload,
          location: venueChanged ? payload.location : match.location,
          status: values.status,
          ...(venueChanged ? { pool_name: null } : {}),
        });
        form.reset(values);
        skipUnloadRef.current = true;
        setLeaveOpen(false);
        setCancelOpen(false);
        leave(backHref);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar. Inténtalo de nuevo.");
      }
    });
  }

  function invalid(errors: FieldErrors<MatchEditorValues>) {
    const next = errors.location || errors.maps_url ? 1 : errors.notes ? 2 : 0;
    setStep(next);
    setLeaveOpen(false);
    setError("Revisa los campos marcados antes de guardar.");
    requestAnimationFrame(() => {
      const field = Object.keys(errors)[0] as keyof MatchEditorValues;
      if (field) form.setFocus(field);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={requestLeave}
        disabled={pending}
        className="text-pool-deep focus-visible:outline-pool-blue inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 text-base font-bold focus-visible:outline-2"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {backLabel}
      </button>
      <header className="border-pool-deep/65 text-pool-deep flex items-center gap-3 rounded-2xl border-2 bg-white p-4">
        <span className="bg-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
          <CalendarDays className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold">Editar partido</h1>
          <p
            className="mt-1 truncate text-sm font-bold text-slate-700"
            title={`${teamLabel} · ${match.opponent}`}
          >
            {teamLabel} · {match.opponent}
          </p>
        </div>
      </header>
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => save(values), invalid)}
          className="grid gap-4"
        >
          <div
            role="tablist"
            aria-label="Datos del partido"
            className="border-pool-deep/60 grid grid-cols-3 gap-1 rounded-2xl border-2 bg-white p-1"
          >
            {panels.map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                id={`${id}-tab-${index}`}
                aria-controls={`${id}-panel`}
                aria-selected={step === index}
                tabIndex={step === index ? 0 : -1}
                disabled={pending}
                onClick={() => setStep(index)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % 3
                      : event.key === "ArrowLeft"
                        ? (index + 2) % 3
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : null;
                  if (next !== null) {
                    event.preventDefault();
                    setStep(next);
                    buttonRefs.current[next]?.focus();
                  }
                }}
                className={`focus-visible:outline-pool-blue min-h-12 rounded-xl px-2 text-base font-extrabold focus-visible:outline-2 ${step === index ? "bg-pool-deep text-white" : "text-pool-deep"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border-2 border-red-800 bg-red-50 p-3 font-bold text-red-900"
            >
              {error}
            </p>
          )}
          <div
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={`${id}-tab-${step}`}
            tabIndex={0}
            className="focus-visible:outline-pool-blue rounded-xl focus-visible:outline-2"
          >
            <fieldset disabled={pending} className="grid min-w-0 gap-3">
              {step === 0 && (
                <>
                  <MatchIdentityFields editableStatus />
                  <MatchScheduleFields />
                </>
              )}
              {step === 1 && <MatchLocationFields />}
              {step === 2 && (
                <section className="border-pool-deep/60 rounded-2xl border-2 bg-white p-4">
                  <MatchTextField
                    name="notes"
                    label="Notas para el equipo (opcional)"
                    placeholder="Hora de llegada, material que hay que llevar…"
                    helper="Las verán jugadores y familias."
                  />
                </section>
              )}
            </fieldset>
          </div>
          <div className="sticky bottom-[calc(var(--bottom-nav-height,4.5rem)+env(safe-area-inset-bottom))] z-10 rounded-2xl bg-white p-3 shadow-lg">
            <button type="submit" disabled={pending} className={`${matchActionClass} w-full`}>
              {pending ? (
                <Loader2
                  className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Check className="h-5 w-5" aria-hidden="true" />
              )}
              {pending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </FormProvider>
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
            onClick: () => void form.handleSubmit((values) => save(values), invalid)(),
          },
          { label: "Seguir editando", tone: "secondary", onClick: () => setLeaveOpen(false) },
          {
            label: "Salir sin guardar",
            tone: "subtle",
            onClick: () => {
              skipUnloadRef.current = true;
              setLeaveOpen(false);
              leave(backHref);
            },
          },
        ]}
      />
      <ActaGuardSheet
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="¿Cancelar este partido?"
        summary={`${teamLabel} contra ${match.opponent}`}
        description="El encuentro pasará a Cancelados. Se conservarán sus datos y podrás volver a editarlo."
        context="Partidos"
        icon="warning"
        pending={pending}
        error={error}
        actions={[
          {
            label: "Cancelar partido y guardar",
            tone: "danger",
            onClick: () => void form.handleSubmit((values) => save(values, true), invalid)(),
          },
          { label: "Seguir editando", tone: "secondary", onClick: () => setCancelOpen(false) },
        ]}
      />
    </>
  );
}

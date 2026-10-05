"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Slot } from "@radix-ui/react-slot";

import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import {
  matchEditorSchema,
  matchFormPayload,
  type MatchEditorValues,
} from "@/lib/domain/admin-matches";
import { HOME_LEAGUE_LOCATION, HOME_LEAGUE_MAPS_URL } from "@/lib/domain/match-venue";
import { createMatch, type Team } from "@/server/actions/admin";

import {
  MatchIdentityFields,
  MatchLocationFields,
  MatchReview,
  MatchScheduleFields,
  MatchTextField,
  matchActionClass,
  matchSecondaryClass,
} from "./match-editor-fields";
import { MatchManagementSheet } from "./match-management-sheet";
import { useMatchVenue } from "./use-match-venue";

export interface MatchFormSheetProps {
  teams: Array<Team & { season_label: string }>;
  defaultTeamId: string | null;
  defaultSeasonId: string | null;
  trigger: ReactNode;
}

const steps = ["Equipos", "Fecha", "Revisar"];

export function MatchFormSheet({
  teams,
  defaultTeamId,
  defaultSeasonId,
  trigger,
}: MatchFormSheetProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useForm<MatchEditorValues>({
    resolver: zodResolver(matchEditorSchema),
    defaultValues: {
      team_id: defaultTeamId ?? teams[0]?.id ?? "",
      opponent: "",
      competition_type: "league",
      status: "scheduled",
      is_home: true,
      location: HOME_LEAGUE_LOCATION,
      maps_url: HOME_LEAGUE_MAPS_URL,
      scheduled_at_local: "",
      notes: "",
    },
  });
  useMatchVenue(form, teams);
  const dirty = form.formState.isDirty;

  function requestClose(next: boolean) {
    if (pending) return;
    if (!next && dirty) setLeaveOpen(true);
    else setOpen(next);
  }

  function start() {
    const selected = params.get("team");
    if (selected && teams.some((team) => team.id === selected) && !dirty)
      form.setValue("team_id", selected);
    setOpen(true);
  }

  function goTo(next: number) {
    setStep(next);
    setError(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function continueStep() {
    const fields =
      step === 0
        ? (["team_id", "opponent", "competition_type", "is_home"] as const)
        : (["scheduled_at_local", "location", "maps_url"] as const);
    const valid = await form.trigger([...fields], { shouldFocus: true });
    if (step === 0 && !teams.some((team) => team.id === form.getValues("team_id"))) {
      form.setError(
        "team_id",
        { message: "Elige un equipo de esta temporada." },
        { shouldFocus: true },
      );
      return;
    }
    if (valid) goTo(step + 1);
    else
      requestAnimationFrame(() => {
        const field = fields.find((name) => form.getFieldState(name).error);
        if (field) form.setFocus(field);
      });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    void form.handleSubmit(
      (values) => {
        const team = teams.find((item) => item.id === values.team_id);
        if (!team) {
          goTo(0);
          form.setError("team_id", { message: "Elige un equipo de esta temporada." });
          return;
        }
        setError(null);
        startTransition(async () => {
          try {
            const match = await createMatch({
              ...matchFormPayload(values),
              team_id: values.team_id,
              season_id: team.season_id ?? defaultSeasonId ?? "",
            });
            form.reset(values);
            setOpen(false);
            router.push(`/admin/matches/${match.id}?from=admin`);
            router.refresh();
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "No pudimos crear el partido. Inténtalo de nuevo.",
            );
          }
        });
      },
      (errors) => {
        const next =
          errors.opponent || errors.team_id
            ? 0
            : errors.scheduled_at_local || errors.location || errors.maps_url
              ? 1
              : 2;
        goTo(next);
      },
    )(event);
  }

  return (
    <>
      <Slot onClick={start} aria-haspopup="dialog" aria-expanded={open}>
        {trigger}
      </Slot>
      <MatchManagementSheet
        open={open}
        onOpenChange={requestClose}
        pending={pending}
        title="Nuevo partido"
      >
        <FormProvider {...form}>
          <nav
            aria-label="Pasos para crear un partido"
            className="grid shrink-0 grid-cols-3 gap-1.5 bg-white px-4 py-3"
          >
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                disabled={pending || index > step}
                aria-current={index === step ? "step" : undefined}
                onClick={() => goTo(index)}
                className={`focus-visible:outline-pool-blue flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-1 text-sm font-bold focus-visible:outline-2 disabled:cursor-default ${index === step ? "border-pool-deep bg-pool-deep text-white" : "border-slate-500 bg-white text-slate-700"}`}
              >
                <span aria-hidden="true">
                  {index < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                {label}
              </button>
            ))}
          </nav>
          <div key={step} className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className={`${step < 2 ? "sr-only" : "mb-3 text-lg font-extrabold"} outline-none`}
            >
              {["¿Contra quién jugáis?", "¿Cuándo y dónde?", "Comprueba los datos"][step]}
            </h2>
            <form
              id={formId}
              noValidate
              onSubmit={(event) => {
                if (step < 2) {
                  event.preventDefault();
                  void continueStep();
                } else void submit(event);
              }}
              className="grid gap-3"
            >
              <fieldset disabled={pending} className="grid min-w-0 gap-3">
                {step === 0 && <MatchIdentityFields teams={teams} />}
                {step === 1 && (
                  <>
                    <MatchScheduleFields />
                    <MatchLocationFields />
                  </>
                )}
                {step === 2 && (
                  <>
                    <MatchReview
                      teamLabel={
                        teams.find((team) => team.id === form.getValues("team_id"))?.label ??
                        "Morvedre"
                      }
                      onEdit={goTo}
                    />
                    <details
                      open={form.formState.errors.notes ? true : undefined}
                      className="border-pool-deep/60 group rounded-2xl border-2 bg-white px-4"
                    >
                      <summary className="focus-visible:outline-pool-blue flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 text-base font-bold focus-visible:outline-2">
                        Añadir notas (opcional)
                        <ChevronDown className="h-5 w-5 group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <div className="pb-4">
                        <MatchTextField
                          name="notes"
                          label="Notas para el equipo (opcional)"
                          placeholder="Hora de llegada, material que hay que llevar…"
                          helper="Las verán jugadores y familias."
                        />
                      </div>
                    </details>
                  </>
                )}
              </fieldset>
            </form>
          </div>
          <div className="grid shrink-0 gap-2 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {error && (
              <p
                role="alert"
                className="rounded-xl border-2 border-red-800 bg-red-50 p-3 font-bold text-red-900"
              >
                {error}
              </p>
            )}
            <div className={`grid gap-2 ${step > 0 ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
              {step > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => goTo(step - 1)}
                  className={matchSecondaryClass}
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  Atrás
                </button>
              )}
              <button type="submit" form={formId} disabled={pending} className={matchActionClass}>
                {pending ? (
                  <Loader2
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : step < 2 ? (
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Check className="h-5 w-5" aria-hidden="true" />
                )}
                {pending ? "Creando partido…" : step < 2 ? "Continuar" : "Crear partido"}
              </button>
            </div>
          </div>
        </FormProvider>
      </MatchManagementSheet>
      <ActaGuardSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        context="Nuevo partido"
        title="¿Dejarlo para después?"
        summary="El partido aún no está creado"
        description="Si sales, se borrarán los datos que has rellenado."
        icon="warning"
        actions={[
          { label: "Seguir rellenando", tone: "primary", onClick: () => setLeaveOpen(false) },
          {
            label: "Descartar y cerrar",
            tone: "subtle",
            onClick: () => {
              form.reset();
              setStep(0);
              setError(null);
              setLeaveOpen(false);
              setOpen(false);
            },
          },
        ]}
      />
    </>
  );
}

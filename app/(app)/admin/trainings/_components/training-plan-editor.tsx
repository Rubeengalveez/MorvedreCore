"use client";
import { cn } from "@/lib/utils/cn";

import { Plus, Trash2, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import {
  trainingPlanSchema,
  previewTrainingDates,
  trainingKind,
  trainingKindLabel,
  trainingTitle,
  trainingBreakRanges,
  trainingDay,
  shiftTrainingDate,
  trainingDate,
  TRAINING_DAYS,
  type TrainingPlanInput,
  type TrainingTeam,
  type TrainingPlayer,
  type ManagedTrainingBlock,
} from "@/lib/domain/training-management";
import { saveTrainingPlanAction } from "@/server/actions/admin/training-management";
import {
  TrainingField,
  trainingControl,
  trainingSecondary,
  TrainingTeams,
  TrainingTypePicker,
  TrainingTeamLabels,
} from "./training-ui";

export function TrainingPlanEditor({
  teams,
  players,
  blocks = [],
  seasonEnd,
  onClose,
  onSaved,
}: {
  teams: TrainingTeam[];
  players: TrainingPlayer[];
  blocks?: ManagedTrainingBlock[];
  seasonEnd: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [openedAt] = useState(() => Date.now());
  const today = trainingDay(new Date(openedAt));
  const first = blocks[0];
  const initial: TrainingPlanInput = {
    mode: "weekly",
    series_id: first?.series_id ?? null,
    block_ids: blocks.map((block) => block.id),
    team_ids: [...new Set(blocks.map((block) => block.team_id))],
    player_ids: first?.player_ids
      ? [...new Set(blocks.flatMap((block) => block.player_ids ?? []))]
      : null,
    kind: trainingKind(first?.kind ?? "water"),
    label: first ? trainingTitle(first.label, first.kind) : "",
    location: first?.location ?? "",
    maps_url: first?.maps_url ?? null,
    start_date: first && first.start_date > today ? first.start_date : today,
    end_date:
      first && first.end_date >= today
        ? first.end_date
        : seasonEnd >= today
          ? seasonEnd
          : shiftTrainingDate(today, 90),
    slots: first
      ? [
          ...new Map(
            blocks.map((block) => [
              `${block.weekdays}/${block.start_time}/${block.end_time}`,
              {
                slot_id: block.schedule_slot_id ?? block.id,
                weekdays: block.weekdays,
                start_time: block.start_time.slice(0, 5),
                end_time: block.end_time.slice(0, 5),
              },
            ]),
          ).values(),
        ]
      : [{ weekdays: [], start_time: "18:00", end_time: "19:30" }],
    excluded_dates: first?.excluded_dates ?? [],
  };
  const [plan, setPlan] = useState(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [discard, setDiscard] = useState(false);
  const [query, setQuery] = useState("");
  const [breakStart, setBreakStart] = useState(today);
  const [breakEnd, setBreakEnd] = useState(today);
  const activePlayers = players.filter((player) =>
    player.team_ids.some((id) => plan.team_ids.includes(id)),
  );
  const dirty = JSON.stringify(plan) !== JSON.stringify(initial);
  const parsed = trainingPlanSchema.safeParse(plan);
  const breakRanges = trainingBreakRanges(
    (plan.excluded_dates ?? []).filter((d) => d >= plan.start_date && d <= plan.end_date),
  );
  const count = parsed.success
    ? previewTrainingDates(parsed.data).filter(
        (session) =>
          parsed.data.mode === "single" || new Date(session.start_datetime).getTime() >= openedAt,
      ).length
    : 0;
  function patch(value: Partial<TrainingPlanInput>) {
    setError(null);
    setPlan((prev) => ({ ...prev, ...value }));
  }
  function next() {
    setError(null);
    if (step === 0) {
      if (!plan.team_ids.length) {
        setError("Elige al menos un equipo.");
        return;
      }
      if (plan.player_ids && !plan.player_ids.length) {
        setError("Elige los jugadores que van a participar.");
        return;
      }
      if (
        plan.player_ids &&
        plan.team_ids.some(
          (teamId) =>
            !activePlayers.some(
              (p) => p.team_ids.includes(teamId) && plan.player_ids?.includes(p.id),
            ),
        )
      ) {
        setError("Elige al menos un jugador de cada equipo, o quita el equipo que no participa.");
        return;
      }
      setStep(1);
      return;
    }
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa el horario.");
      return;
    }
    if (!count) {
      setError("No hay entrenamientos en este periodo. Revisa los días elegidos.");
      return;
    }
    setStep(2);
  }
  function save() {
    startTransition(async () => {
      try {
        await saveTrainingPlanAction(plan);
        onSaved(
          first
            ? "Horario actualizado"
            : plan.mode === "single"
              ? "Entrenamiento añadido"
              : "Horario creado",
        );
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar el horario.");
      }
    });
  }
  function addBreak() {
    if (
      breakEnd < breakStart ||
      breakStart < plan.start_date ||
      breakEnd > plan.end_date ||
      new Date(breakEnd).getTime() - new Date(breakStart).getTime() > 366 * 86400000
    ) {
      setError("El descanso debe estar dentro del periodo del horario.");
      return;
    }
    const days = [];
    for (let day = breakStart; day <= breakEnd; day = shiftTrainingDate(day, 1)) days.push(day);
    patch({ excluded_dates: [...new Set([...(plan.excluded_dates ?? []), ...days])].sort() });
  }
  const form = (
    <div className="text-pool-deep space-y-5">
      <ol
        aria-label="Pasos"
        className="grid grid-cols-3 gap-2 text-xs font-bold min-[360px]:text-sm"
      >
        {["Equipos", "Horario", "Revisar"].map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              `flex items-center gap-1.5 ${index === step ? "text-pool-deep" : "text-ink-700"}`,
            )}
          >
            <span
              className={cn(
                `border-pool-deep flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${index === step ? "bg-pool-deep text-white" : "bg-white"}`,
              )}
            >
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {step === 0 && (
        <>
          {!first && (
            <fieldset>
              <legend className="mb-2 font-extrabold">¿Se repite?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["weekly", "Cada semana"],
                    ["single", "Un día suelto"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={plan.mode === mode}
                    className={cn(
                      `${trainingSecondary} ${plan.mode === mode ? "bg-blue-100" : ""}`,
                    )}
                    onClick={() =>
                      patch({
                        mode,
                        end_date:
                          mode === "single"
                            ? plan.start_date
                            : seasonEnd >= today
                              ? seasonEnd
                              : shiftTrainingDate(today, 90),
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <TrainingTypePicker
            value={plan.kind}
            onChange={(kind) =>
              patch({
                kind,
                label: ["Agua", "Físico/seco", "Reunión"].includes(plan.label ?? "")
                  ? trainingKindLabel(kind)
                  : plan.label,
              })
            }
          />
          <TrainingTeams
            teams={teams}
            selected={plan.team_ids}
            onChange={(ids) =>
              patch({
                team_ids: ids,
                player_ids:
                  plan.player_ids?.filter((id) =>
                    players
                      .find((p) => p.id === id)
                      ?.team_ids.some((teamId) => ids.includes(teamId)),
                  ) ?? null,
              })
            }
          />
          <fieldset>
            <legend className="mb-2 font-extrabold">Participantes</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={plan.player_ids === null}
                className={cn(
                  `${trainingSecondary} ${plan.player_ids === null ? "bg-blue-100" : ""}`,
                )}
                onClick={() => patch({ player_ids: null })}
              >
                Todo el equipo
              </button>
              <button
                type="button"
                aria-pressed={plan.player_ids !== null}
                className={cn(
                  `${trainingSecondary} ${plan.player_ids !== null ? "bg-blue-100" : ""}`,
                )}
                onClick={() => patch({ player_ids: [] })}
              >
                Elegir jugadores
              </button>
            </div>
          </fieldset>
          {plan.player_ids !== null && (
            <div className="space-y-2">
              <TrainingField label="Buscar jugador" htmlFor="training-player-search">
                <input
                  id="training-player-search"
                  className={trainingControl}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nombre o apellido"
                />
              </TrainingField>
              <p role="status" className="font-bold">
                {plan.player_ids?.length ?? 0} seleccionados
              </p>
              <button
                type="button"
                className={trainingSecondary}
                onClick={() => patch({ player_ids: activePlayers.map((p) => p.id) })}
              >
                Elegir toda la lista
              </button>
              <div className="border-pool-deep/70 max-h-64 space-y-2 overflow-y-auto rounded-xl border-2 bg-white p-2">
                {activePlayers
                  .filter((p) =>
                    p.full_name
                      .normalize("NFD")
                      .replace(/\p{Diacritic}/gu, "")
                      .toLowerCase()
                      .includes(
                        query
                          .normalize("NFD")
                          .replace(/\p{Diacritic}/gu, "")
                          .toLowerCase()
                          .trim(),
                      ),
                  )
                  .map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      aria-pressed={plan.player_ids?.includes(player.id) ?? false}
                      onClick={() =>
                        patch({
                          player_ids: plan.player_ids?.includes(player.id)
                            ? plan.player_ids.filter((id) => id !== player.id)
                            : [...(plan.player_ids ?? []), player.id],
                        })
                      }
                      className={cn(
                        `${trainingSecondary} w-full justify-between text-left ${plan.player_ids?.includes(player.id) ? "bg-blue-100" : ""}`,
                      )}
                    >
                      <span>{player.full_name}</span>
                      {plan.player_ids?.includes(player.id) && (
                        <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                {!activePlayers.length && (
                  <p className="p-2 font-semibold">Elige un equipo con jugadores.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <div className={plan.mode === "weekly" ? "grid grid-cols-2 gap-3" : ""}>
            <TrainingField
              label={plan.mode === "weekly" ? "Desde" : "Fecha"}
              htmlFor="training-from"
            >
              <input
                id="training-from"
                type="date"
                min={today}
                className={cn(`${trainingControl} min-w-0 px-2`)}
                value={plan.start_date}
                onChange={(e) =>
                  patch({
                    start_date: e.target.value,
                    ...(plan.mode === "single" ? { end_date: e.target.value } : {}),
                  })
                }
              />
            </TrainingField>
            {plan.mode === "weekly" && (
              <TrainingField label="Hasta" htmlFor="training-to">
                <input
                  id="training-to"
                  type="date"
                  min={plan.start_date}
                  className={cn(`${trainingControl} min-w-0 px-2`)}
                  value={plan.end_date}
                  onChange={(e) => patch({ end_date: e.target.value })}
                />
              </TrainingField>
            )}
          </div>
          {plan.slots.map((slot, index) => (
            <fieldset
              key={index}
              className="border-pool-deep/70 space-y-3 rounded-xl border-2 bg-white p-3"
            >
              <legend className="px-2 font-extrabold">
                {plan.mode === "weekly" ? `Horario ${index + 1}` : "Hora"}
              </legend>
              {plan.mode === "weekly" && (
                <div className="grid grid-cols-4 gap-2">
                  {TRAINING_DAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={slot.weekdays.includes(i + 1)}
                      className={cn(
                        `${trainingSecondary} px-1 text-sm ${slot.weekdays.includes(i + 1) ? "bg-pool-deep text-white" : ""}`,
                      )}
                      onClick={() =>
                        patch({
                          slots: plan.slots.map((item, j) =>
                            j !== index
                              ? item
                              : {
                                  ...item,
                                  weekdays: item.weekdays.includes(i + 1)
                                    ? item.weekdays.filter((n) => n !== i + 1)
                                    : [...item.weekdays, i + 1].sort(),
                                },
                          ),
                        })
                      }
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(["start_time", "end_time"] as const).map((field) => (
                  <TrainingField
                    key={field}
                    label={field === "start_time" ? "Inicio" : "Fin"}
                    htmlFor={`training-${index}-${field}`}
                  >
                    <input
                      id={`training-${index}-${field}`}
                      type="time"
                      className={cn(`${trainingControl} min-w-0`)}
                      value={slot[field]}
                      onChange={(e) =>
                        patch({
                          slots: plan.slots.map((item, j) =>
                            j !== index ? item : { ...item, [field]: e.target.value },
                          ),
                        })
                      }
                    />
                  </TrainingField>
                ))}
              </div>
              {plan.slots.length > 1 && (
                <button
                  type="button"
                  className={cn(`${trainingSecondary} text-red-800`)}
                  onClick={() => patch({ slots: plan.slots.filter((_, j) => j !== index) })}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Quitar horario
                </button>
              )}
            </fieldset>
          ))}
          {plan.mode === "weekly" && plan.slots.length < 8 && (
            <button
              type="button"
              className={cn(`${trainingSecondary} w-full bg-blue-50`)}
              onClick={() =>
                patch({
                  slots: [...plan.slots, { weekdays: [], start_time: "18:00", end_time: "19:30" }],
                })
              }
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Añadir otro horario
            </button>
          )}
          <TrainingField label="Lugar" htmlFor="training-location">
            <input
              id="training-location"
              maxLength={200}
              className={trainingControl}
              value={plan.location}
              placeholder="Piscina, gimnasio…"
              onChange={(e) => patch({ location: e.target.value, maps_url: null })}
            />
          </TrainingField>
          <TrainingField label="Nombre (opcional)" htmlFor="training-label">
            <input
              id="training-label"
              maxLength={100}
              className={trainingControl}
              value={plan.label}
              placeholder={trainingKindLabel(plan.kind)}
              onChange={(e) => patch({ label: e.target.value })}
            />
          </TrainingField>
          {plan.mode === "weekly" && (
            <details className="border-pool-deep/70 rounded-xl border-2 bg-white p-3">
              <summary className="min-h-12 cursor-pointer py-3 font-extrabold">
                Vacaciones y días sin entrenamiento
                {plan.excluded_dates?.length
                  ? ` · ${plan.excluded_dates.length} ${plan.excluded_dates.length === 1 ? "día" : "días"}`
                  : ""}
              </summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TrainingField label="Inicio del descanso" htmlFor="break-start">
                    <input
                      id="break-start"
                      type="date"
                      className={cn(`${trainingControl} min-w-0 px-2`)}
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                    />
                  </TrainingField>
                  <TrainingField label="Fin del descanso" htmlFor="break-end">
                    <input
                      id="break-end"
                      type="date"
                      className={cn(`${trainingControl} min-w-0 px-2`)}
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                    />
                  </TrainingField>
                </div>
                <button
                  type="button"
                  className={cn(`${trainingSecondary} w-full`)}
                  onClick={addBreak}
                >
                  Añadir descanso
                </button>
                {breakRanges.map((range) => (
                  <div
                    key={range.from}
                    className="border-pool-deep/70 flex items-center justify-between gap-2 rounded-lg border bg-blue-50 p-2"
                  >
                    <p className="text-sm font-bold">
                      {trainingDate(range.from, true)}
                      {range.from !== range.to && ` — ${trainingDate(range.to, true)}`}
                    </p>
                    <button
                      type="button"
                      aria-label={`Quitar descanso del ${trainingDate(range.from, true)}`}
                      className={cn(
                        trainingSecondary,
                        "shrink-0 border-red-800 bg-red-50 px-3 text-red-900",
                      )}
                      onClick={() =>
                        patch({
                          excluded_dates: (plan.excluded_dates ?? []).filter(
                            (d) => d < range.from || d > range.to,
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
      {step === 2 && (
        <section className="border-pool-deep space-y-4 rounded-xl border-2 bg-white p-4">
          <h3 className="text-xl font-extrabold">{plan.label || trainingKindLabel(plan.kind)}</h3>
          <TrainingTeamLabels teams={teams} ids={plan.team_ids} />
          <p className="font-bold">
            {plan.mode === "weekly"
              ? `${count} fechas · ${trainingDate(plan.start_date, true)} — ${trainingDate(plan.end_date, true)}`
              : trainingDate(plan.start_date, true)}
          </p>
          {plan.slots.map((slot, index) => (
            <div key={index} className="border-pool-deep/70 rounded-lg border bg-blue-50 p-3">
              <p className="font-extrabold">
                {slot.start_time} — {slot.end_time}
              </p>
              {plan.mode === "weekly" && (
                <p className="mt-1 font-semibold">
                  {slot.weekdays.map((day) => TRAINING_DAYS[day - 1]).join(" · ")}
                </p>
              )}
            </div>
          ))}
          <p className="font-semibold">{plan.location || "Sin lugar indicado"}</p>
          {!!breakRanges.length && (
            <div className="border-pool-deep/70 rounded-lg border bg-blue-50 p-3">
              <p className="font-bold">Días sin entrenamiento</p>
              {breakRanges.map((range) => (
                <p className="mt-1 text-sm font-semibold" key={range.from}>
                  {trainingDate(range.from, true)}
                  {range.from !== range.to && ` — ${trainingDate(range.to, true)}`}
                </p>
              ))}
            </div>
          )}
          <p className="font-bold">
            {plan.player_ids
              ? `${plan.player_ids.length} ${plan.player_ids.length === 1 ? "jugador elegido" : "jugadores elegidos"}`
              : "Plantillas completas"}
          </p>
          {!!first && (
            <p className="border-pool-deep/70 rounded-lg border bg-blue-50 p-3 text-sm font-semibold">
              Se conservan la asistencia y los cambios de días concretos.
            </p>
          )}
        </section>
      )}
    </div>
  );
  return (
    <>
      <ActaGuardSheet
        open
        onOpenChange={(open) => {
          if (!open) {
            if (dirty) setDiscard(true);
            else onClose();
          }
        }}
        context="Entrenamientos"
        title={
          step === 2
            ? "Confirmar horario"
            : first
              ? "Editar horario semanal"
              : "Añadir entrenamiento"
        }
        icon="saved"
        tall
        stickyActions
        body={form}
        error={error}
        pending={pending}
        actions={
          step === 2
            ? [
                {
                  label: first
                    ? "Guardar cambios"
                    : plan.mode === "single"
                      ? "Añadir entrenamiento"
                      : "Crear horario",
                  tone: "primary",
                  onClick: save,
                },
                { label: "Volver a revisar", tone: "secondary", onClick: () => setStep(1) },
              ]
            : [
                { label: "Continuar", tone: "primary", onClick: next },
                ...(step === 1
                  ? [{ label: "Atrás", tone: "secondary" as const, onClick: () => setStep(0) }]
                  : []),
              ]
        }
      />
      <ActaGuardSheet
        open={discard}
        onOpenChange={setDiscard}
        context="Cambios sin guardar"
        title="¿Salir sin guardar?"
        summary="El horario todavía no está guardado"
        description="Puedes seguir editando o descartar estos cambios."
        icon="warning"
        actions={[
          { label: "Seguir editando", tone: "primary", onClick: () => setDiscard(false) },
          { label: "Salir sin guardar", tone: "subtle", onClick: onClose },
        ]}
      />
    </>
  );
}

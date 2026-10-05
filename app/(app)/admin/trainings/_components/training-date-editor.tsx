"use client";
import { cn } from "@/lib/utils/cn";

import { useState, useTransition } from "react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import {
  changeTrainingDatesAction,
  previewTrainingChangeAction,
} from "@/server/actions/admin/training-management";
import {
  trainingDay,
  trainingDate,
  trainingTime,
  shiftTrainingDate,
  type ManagedTrainingSession,
  type TrainingTeam,
  type TrainingPlayer,
  type TrainingChangeInput,
} from "@/lib/domain/training-management";
import {
  TrainingTeams,
  TrainingField,
  trainingControl,
  trainingSecondary,
  TrainingTeamLabels,
  TrainingTypePicker,
} from "./training-ui";

export function TrainingDateEditor({
  teams,
  players,
  sessions,
  initialOperation = "edit",
  onClose,
  onSaved,
}: {
  teams: TrainingTeam[];
  players: TrainingPlayer[];
  sessions?: ManagedTrainingSession[];
  initialOperation?: "edit" | "cancel" | "restore";
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const today = trainingDay(new Date());
  const first = sessions?.[0];
  const [operation, setOperation] = useState(initialOperation);
  const [teamIds, setTeamIds] = useState([...new Set(sessions?.map((s) => s.team_id) ?? [])]);
  const [from, setFrom] = useState(first ? trainingDay(first.scheduled_at) : today);
  const [to, setTo] = useState(
    first ? trainingDay(first.scheduled_at) : shiftTrainingDate(today, 6),
  );
  const [startTime, setStartTime] = useState(first ? trainingTime(first.scheduled_at) : "18:00");
  const [endTime, setEndTime] = useState(
    first
      ? trainingTime(
          new Date(
            new Date(first.scheduled_at).getTime() + first.duration_minutes * 60000,
          ).toISOString(),
        )
      : "19:30",
  );
  const [location, setLocation] = useState(first?.location ?? "");
  const [kind, setKind] = useState<"water" | "dry" | "meeting">(
    (first?.kind as "water" | "dry" | "meeting") ?? "water",
  );
  const [reason, setReason] = useState("");
  const [changePlayers, setChangePlayers] = useState(false);
  const [playerIds, setPlayerIds] = useState<string[] | null>(
    first?.player_ids ? [...new Set(sessions?.flatMap((s) => s.player_ids ?? []) ?? [])] : null,
  );
  const [review, setReview] = useState<ManagedTrainingSession[] | null>(
    first && initialOperation === "restore" ? (sessions ?? null) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [discard, setDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);
  function changed(action: () => void) {
    action();
    setDirty(true);
    setError(null);
  }
  function check() {
    if (operation === "edit" && (endTime <= startTime || !startTime || !endTime)) {
      setError("La hora de fin debe ser posterior al inicio.");
      return;
    }
    if (operation === "cancel" && reason.trim().length < 2) {
      setError("Indica el motivo de la cancelación.");
      return;
    }
    startTransition(async () => {
      try {
        const items =
          sessions ?? (await previewTrainingChangeAction({ team_ids: teamIds, from, to }));
        const chosen = items.filter((s) => (operation === "restore" ? s.cancelled : !s.cancelled));
        if (
          operation === "edit" &&
          changePlayers &&
          playerIds !== null &&
          chosen.some(
            (session) =>
              !players.some(
                (p) => playerIds.includes(p.id) && p.team_ids.includes(session.team_id),
              ),
          )
        )
          throw new Error(
            "Elige al menos un jugador de cada equipo, o cambia solo las fechas del equipo que participa.",
          );
        if (!chosen.length)
          throw new Error(
            operation === "restore"
              ? "No hay entrenamientos cancelados en estas fechas."
              : "No hay entrenamientos activos en estas fechas.",
          );
        setReview(chosen);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos revisar las fechas.");
      }
    });
  }
  function save() {
    if (!review) return;
    const input: TrainingChangeInput = {
      session_ids: review.map((s) => s.id),
      operation,
      ...(operation === "edit" && changePlayers ? { player_ids: playerIds } : {}),
      ...(operation === "edit"
        ? {
            ...(first ? { date: from } : {}),
            start_time: startTime,
            end_time: endTime,
            location,
            kind,
          }
        : operation === "cancel"
          ? { reason }
          : {}),
    };
    startTransition(async () => {
      try {
        await changeTrainingDatesAction(input);
        onSaved(
          operation === "cancel"
            ? "Entrenamientos cancelados"
            : operation === "restore"
              ? "Entrenamientos reactivados"
              : "Fechas actualizadas",
        );
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar el cambio.");
      }
    });
  }
  const occurrenceCount = review
    ? new Set(review.map((s) => `${s.joint_id ?? s.id}/${s.scheduled_at}`)).size
    : 0;
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
          review
            ? "Confirmar cambio"
            : first
              ? operation === "cancel"
                ? "Cancelar entrenamiento"
                : "Cambiar este día"
              : "Cambiar fechas"
        }
        icon={operation === "cancel" ? "warning" : "saved"}
        tall
        stickyActions
        pending={pending}
        error={error}
        body={
          <div className="text-pool-deep space-y-5">
            {review ? (
              <section className="border-pool-deep space-y-3 rounded-xl border-2 bg-white p-4">
                <h3 className="text-xl font-extrabold">
                  {operation === "cancel"
                    ? "Cancelar"
                    : operation === "restore"
                      ? "Reactivar"
                      : "Cambiar"}{" "}
                  {occurrenceCount} {occurrenceCount === 1 ? "entrenamiento" : "entrenamientos"}
                </h3>
                <TrainingTeamLabels teams={teams} ids={review.map((s) => s.team_id)} />
                <p className="font-semibold">
                  {trainingDate(from, true)}
                  {!first && ` — ${trainingDate(to, true)}`}
                </p>
                {operation === "edit" && (
                  <div className="border-pool-deep/70 rounded-lg border bg-blue-50 p-3">
                    <p className="text-xl font-extrabold">
                      {startTime} — {endTime}
                    </p>
                    <p className="mt-1 font-semibold">{location || "Sin lugar indicado"}</p>
                    {changePlayers && (
                      <p className="mt-2 font-semibold">
                        {playerIds === null
                          ? "Todo el equipo"
                          : `${playerIds.length} ${playerIds.length === 1 ? "jugador elegido" : "jugadores elegidos"}`}
                      </p>
                    )}
                  </div>
                )}

                {operation === "cancel" && (
                  <p className="rounded-lg border border-red-800 bg-red-50 p-3 font-semibold text-red-900">
                    {reason}
                  </p>
                )}
                <p className="border-pool-deep/70 rounded-lg border bg-blue-50 p-3 text-sm font-semibold">
                  El horario semanal se mantiene. Las familias recibirán el aviso del cambio.
                </p>
              </section>
            ) : (
              <>
                {!first && (
                  <fieldset>
                    <legend className="mb-2 font-extrabold">¿Qué quieres hacer?</legend>
                    <div className="grid grid-cols-1 gap-2">
                      {(
                        [
                          ["edit", "Cambiar hora o lugar"],
                          ["cancel", "Cancelar entrenamientos"],
                          ["restore", "Reactivar cancelados"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={operation === value}
                          className={cn(
                            `${trainingSecondary} justify-start ${operation === value ? "bg-blue-100" : ""}`,
                          )}
                          onClick={() => changed(() => setOperation(value))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {first && (
                  <section className="border-pool-deep/70 space-y-2 rounded-xl border-2 bg-white p-3">
                    <TrainingTeamLabels teams={teams} ids={teamIds} />
                    <p className="font-bold">
                      {trainingDate(first.scheduled_at, true)} · {trainingTime(first.scheduled_at)}
                    </p>
                  </section>
                )}
                {!first && (
                  <TrainingTeams
                    teams={teams}
                    selected={teamIds}
                    onChange={(ids) => changed(() => setTeamIds(ids))}
                  />
                )}
                {(!first || operation === "edit") && (
                  <div className={!first ? "grid grid-cols-2 gap-3" : ""}>
                    <TrainingField label={first ? "Fecha" : "Desde"} htmlFor="change-from">
                      <input
                        id="change-from"
                        type="date"
                        min={today}
                        disabled={!!first && operation !== "edit"}
                        className={cn(`${trainingControl} min-w-0 px-2`)}
                        value={from}
                        onChange={(e) => changed(() => setFrom(e.target.value))}
                      />
                    </TrainingField>
                    {!first && (
                      <TrainingField label="Hasta" htmlFor="change-to">
                        <input
                          id="change-to"
                          type="date"
                          min={from}
                          max={shiftTrainingDate(from, 62)}
                          className={cn(`${trainingControl} min-w-0 px-2`)}
                          value={to}
                          onChange={(e) => changed(() => setTo(e.target.value))}
                        />
                      </TrainingField>
                    )}
                  </div>
                )}
                {operation === "edit" && (
                  <>
                    <TrainingTypePicker
                      value={kind}
                      onChange={(value) => changed(() => setKind(value))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <TrainingField label="Inicio" htmlFor="change-start">
                        <input
                          id="change-start"
                          type="time"
                          className={cn(`${trainingControl} min-w-0`)}
                          value={startTime}
                          onChange={(e) => changed(() => setStartTime(e.target.value))}
                        />
                      </TrainingField>
                      <TrainingField label="Fin" htmlFor="change-end">
                        <input
                          id="change-end"
                          type="time"
                          className={cn(`${trainingControl} min-w-0`)}
                          value={endTime}
                          onChange={(e) => changed(() => setEndTime(e.target.value))}
                        />
                      </TrainingField>
                    </div>
                    <TrainingField label="Lugar" htmlFor="change-location">
                      <input
                        id="change-location"
                        className={trainingControl}
                        value={location}
                        maxLength={200}
                        onChange={(e) => changed(() => setLocation(e.target.value))}
                      />
                    </TrainingField>
                  </>
                )}
                {operation === "edit" && (
                  <fieldset className="border-pool-deep/70 space-y-3 rounded-xl border-2 bg-white p-3">
                    <legend className="px-2 font-extrabold">Participantes</legend>
                    <button
                      type="button"
                      aria-pressed={changePlayers}
                      className={cn(trainingSecondary, "w-full", changePlayers && "bg-blue-100")}
                      onClick={() => changed(() => setChangePlayers(!changePlayers))}
                    >
                      {changePlayers ? "Cambiar participantes ✓" : "Mantener participantes"}
                    </button>
                    {changePlayers && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            aria-pressed={playerIds === null}
                            className={cn(
                              trainingSecondary,
                              "text-sm",
                              playerIds === null && "bg-blue-100",
                            )}
                            onClick={() => changed(() => setPlayerIds(null))}
                          >
                            Todo el equipo
                          </button>
                          <button
                            type="button"
                            aria-pressed={playerIds !== null}
                            className={cn(
                              trainingSecondary,
                              "text-sm",
                              playerIds !== null && "bg-blue-100",
                            )}
                            onClick={() => changed(() => setPlayerIds([]))}
                          >
                            Elegir jugadores
                          </button>
                        </div>
                        {playerIds !== null && (
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            {players
                              .filter((p) => p.team_ids.some((id) => teamIds.includes(id)))
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  aria-pressed={playerIds.includes(p.id)}
                                  className={cn(
                                    trainingSecondary,
                                    "w-full justify-start text-left",
                                    playerIds.includes(p.id) && "bg-blue-100",
                                  )}
                                  onClick={() =>
                                    changed(() =>
                                      setPlayerIds(
                                        playerIds.includes(p.id)
                                          ? playerIds.filter((id) => id !== p.id)
                                          : [...playerIds, p.id],
                                      ),
                                    )
                                  }
                                >
                                  {p.full_name}
                                  {playerIds.includes(p.id) && " ✓"}
                                </button>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </fieldset>
                )}
                {operation === "cancel" && (
                  <TrainingField label="Motivo" htmlFor="change-reason">
                    <input
                      id="change-reason"
                      className={trainingControl}
                      value={reason}
                      maxLength={300}
                      placeholder="Vacaciones, piscina cerrada…"
                      onChange={(e) => changed(() => setReason(e.target.value))}
                    />
                  </TrainingField>
                )}
              </>
            )}
          </div>
        }
        actions={
          review
            ? [
                {
                  label: pending
                    ? "Guardando…"
                    : operation === "cancel"
                      ? "Confirmar cancelación"
                      : operation === "restore"
                        ? "Reactivar entrenamiento"
                        : "Guardar cambio",
                  tone: operation === "cancel" ? "danger" : "primary",
                  onClick: save,
                },
                { label: "Volver a revisar", tone: "secondary", onClick: () => setReview(null) },
              ]
            : [{ label: "Revisar cambio", tone: "primary", onClick: check }]
        }
      />
      <ActaGuardSheet
        open={discard}
        onOpenChange={setDiscard}
        context="Cambios sin guardar"
        title="¿Salir sin guardar?"
        summary="El cambio todavía no se ha guardado"
        description="Puedes seguir editando o descartarlo."
        icon="warning"
        actions={[
          { label: "Seguir editando", tone: "primary", onClick: () => setDiscard(false) },
          { label: "Salir sin guardar", tone: "subtle", onClick: onClose },
        ]}
      />
    </>
  );
}

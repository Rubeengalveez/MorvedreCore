"use client";
import { cn } from "@/lib/utils/cn";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CalendarClock,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ClipboardList,
  Ban,
  RotateCcw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import {
  groupTrainings,
  trainingKindLabel,
  trainingTitle,
  trainingTime,
  trainingDate,
  shiftTrainingDate,
  trainingDay,
  TRAINING_DAYS,
  type ManagedTrainingBlock,
  type ManagedTrainingSession,
  type TrainingTeam,
  type TrainingPlayer,
} from "@/lib/domain/training-management";
import { finishTrainingPlanAction } from "@/server/actions/admin/training-management";
import { TrainingPlanEditor } from "./training-plan-editor";
import { TrainingDateEditor } from "./training-date-editor";
import {
  trainingPrimary,
  trainingSecondary,
  trainingControl,
  TrainingTeamLabels,
} from "./training-ui";

export function TrainingManagement({
  teams,
  managedTeamIds,
  canManageAttendance,
  players,
  blocks,
  sessions,
  from,
  to,
  seasonEnd,
}: {
  teams: TrainingTeam[];
  managedTeamIds: string[];
  canManageAttendance: boolean;
  players: TrainingPlayer[];
  blocks: ManagedTrainingBlock[];
  sessions: ManagedTrainingSession[];
  from: string;
  to: string;
  seasonEnd: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") === "weekly" ? "weekly" : "dates";
  const requestedTeam = params.get("team") ?? "";
  const team = managedTeamIds.includes(requestedTeam) ? requestedTeam : "";
  const [editor, setEditor] = useState<ManagedTrainingBlock[] | "new" | null>(null);
  const [dateEditor, setDateEditor] = useState<{
    sessions?: ManagedTrainingSession[];
    operation?: "edit" | "cancel" | "restore";
  } | null>(null);
  const [finish, setFinish] = useState<ManagedTrainingBlock[] | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [navigating, startNavigation] = useTransition();
  const managedTeams = teams.filter((t) => managedTeamIds.includes(t.id));
  const plans = groupTrainings(blocks, "series_id").filter(
    (rows) => !team || rows.some((row) => row.team_id === team),
  );
  const occurrences = groupTrainings(
    sessions
      .filter((s) => !team || s.team_id === team)
      .map((session) => ({
        ...session,
        joint_id: session.joint_id
          ? `${session.joint_id}/${session.scheduled_at}/${session.cancelled}/${session.location}/${session.kind}`
          : null,
      })),
    "joint_id",
  );
  const days = new Map<string, ManagedTrainingSession[][]>();
  for (const rows of occurrences) {
    const day = trainingDay(rows[0].scheduled_at);
    days.set(day, [
      ...(days.get(day) ?? []),
      rows.map((row) => ({
        ...row,
        joint_id: sessions.find((s) => s.id === row.id)?.joint_id ?? null,
      })),
    ]);
  }
  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startNavigation(() => router.replace(`/admin/trainings?${next}` as Route, { scroll: false }));
  }
  function saved(message: string) {
    setFeedback(message);
    router.refresh();
  }
  function retire() {
    if (!finish) return;
    startTransition(async () => {
      try {
        await finishTrainingPlanAction(finish.map((b) => b.id));
        setFinish(null);
        saved("Horario finalizado");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos finalizar el horario.");
      }
    });
  }
  return (
    <div className="text-pool-deep space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Entrenamientos</h1>
        <span className="border-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 bg-white">
          <CalendarDays className="h-6 w-6" aria-hidden="true" />
        </span>
      </header>
      <button
        type="button"
        className={cn(`${trainingPrimary} w-full`)}
        onClick={() => {
          setFeedback("");
          setEditor("new");
        }}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        Añadir entrenamiento
      </button>
      {feedback && (
        <p
          role="status"
          className="rounded-xl border-2 border-green-800 bg-green-50 p-3 font-bold text-green-900"
        >
          {feedback}
        </p>
      )}
      <div aria-label="Vista de entrenamientos" className="grid grid-cols-2 gap-3">
        {(
          [
            ["dates", "Fechas", CalendarDays],
            ["weekly", "Horario semanal", CalendarClock],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            disabled={navigating}
            className={cn(
              `${trainingSecondary} px-2 text-sm whitespace-nowrap ${view === value ? "border-pool-deep bg-pool-deep text-white" : "bg-white"}`,
            )}
            onClick={() => navigate({ view: value })}
          >
            <Icon className="hidden h-5 w-5 shrink-0 min-[360px]:block" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="sr-only">Equipo</span>
        <select
          className={trainingControl}
          value={team}
          disabled={navigating}
          onChange={(e) => navigate({ team: e.target.value })}
        >
          <option value="">Todos los equipos</option>
          {managedTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {navigating && (
        <p
          role="status"
          className="border-pool-deep/70 flex items-center gap-2 rounded-xl border-2 bg-white p-3 font-bold"
        >
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Actualizando entrenamientos…
        </p>
      )}
      <div className="space-y-4" inert={navigating} aria-busy={navigating}>
        {view === "dates" ? (
          <>
            <section
              aria-label="Periodo de entrenamientos"
              className="border-pool-deep/70 space-y-3 rounded-2xl border-2 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Ver las cuatro semanas anteriores"
                  className={cn(`${trainingSecondary} shrink-0 px-3`)}
                  onClick={() => navigate({ from: shiftTrainingDate(from, -28) })}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <p className="text-center text-sm font-extrabold">
                  {trainingDate(from, true)}
                  <br />
                  {trainingDate(to, true)}
                </p>
                <button
                  type="button"
                  aria-label="Ver las cuatro semanas siguientes"
                  className={cn(`${trainingSecondary} shrink-0 px-3`)}
                  onClick={() => navigate({ from: shiftTrainingDate(from, 28) })}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="min-w-0">
                  <span className="sr-only">Ver fechas desde</span>
                  <input
                    type="date"
                    aria-label="Ver fechas desde"
                    className={cn(`${trainingControl} min-w-0`)}
                    value={from}
                    onChange={(e) => e.target.value && navigate({ from: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className={trainingSecondary}
                  onClick={() => navigate({ from: "" })}
                >
                  Hoy
                </button>
              </div>
              <button
                type="button"
                className={cn(`${trainingSecondary} w-full bg-blue-100`)}
                onClick={() => setDateEditor({})}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Cambiar varios días
              </button>
            </section>
            {!days.size && (
              <Empty
                title="Sin entrenamientos en estas fechas"
                action="Crear un horario o un día suelto"
                onClick={() => setEditor("new")}
              />
            )}
            {[...days.entries()].map(([day, groups]) => (
              <section key={day} className="space-y-3" aria-label={trainingDate(day)}>
                <h2 className="border-pool-deep/70 inline-flex rounded-lg border bg-blue-50 px-3 py-2 text-base font-extrabold capitalize">
                  {trainingDate(day)}
                </h2>
                {groups.map((rows) => {
                  const s = rows[0];
                  const past = trainingDay(s.scheduled_at) < trainingDay(new Date());
                  return (
                    <article
                      key={s.id}
                      className={cn(
                        `border-pool-deep/70 overflow-hidden rounded-2xl border-2 ${s.cancelled ? "bg-red-50" : "bg-white"}`,
                      )}
                    >
                      <div className="bg-pool-deep flex items-center justify-between gap-2 px-4 py-2.5 text-white">
                        <p className="text-lg font-extrabold whitespace-nowrap tabular-nums min-[360px]:text-xl">
                          {trainingTime(s.scheduled_at)}{" "}
                          <span className="text-sm font-semibold min-[360px]:text-base">
                            —{" "}
                            {trainingTime(
                              new Date(
                                new Date(s.scheduled_at).getTime() + s.duration_minutes * 60000,
                              ).toISOString(),
                            )}
                          </span>
                        </p>
                        <span className="rounded-lg border border-white/70 px-2 py-1 text-sm font-bold whitespace-nowrap">
                          {trainingKindLabel(s.kind)}
                        </span>
                      </div>
                      <div className="space-y-3 p-4">
                        <TrainingTeamLabels teams={teams} ids={rows.map((row) => row.team_id)} />
                        {trainingTitle(s.label, s.kind) !== trainingKindLabel(s.kind) && (
                          <h3 className="text-lg font-extrabold">
                            {trainingTitle(s.label, s.kind)}
                          </h3>
                        )}
                        <p className="flex items-start gap-2 font-semibold">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          {s.location || "Lugar sin indicar"}
                        </p>
                        {s.player_ids && (
                          <p className="border-pool-deep/70 rounded-lg border bg-blue-50 px-3 py-2 text-sm font-bold">
                            {new Set(rows.flatMap((row) => row.player_ids ?? [])).size}{" "}
                            {new Set(rows.flatMap((row) => row.player_ids ?? [])).size === 1
                              ? "jugador elegido"
                              : "jugadores elegidos"}
                          </p>
                        )}
                        {s.cancelled ? (
                          <p className="rounded-lg border border-red-800 bg-red-50 px-3 py-2 font-bold text-red-900">
                            Cancelado · {s.cancellation_reason || "Cancelado por el club"}
                          </p>
                        ) : (
                          s.is_exception && (
                            <p className="border-pool-deep/70 inline-flex rounded-lg border bg-blue-100 px-2 py-1 text-sm font-bold">
                              Cambio puntual
                            </p>
                          )
                        )}
                        {!past && (
                          <div className="grid grid-cols-2 gap-2">
                            {s.cancelled ? (
                              <button
                                type="button"
                                className={cn(`${trainingSecondary} col-span-2 bg-blue-50`)}
                                onClick={() =>
                                  setDateEditor({ sessions: rows, operation: "restore" })
                                }
                              >
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                Reactivar
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={cn(
                                    `${trainingSecondary} bg-blue-50 text-sm whitespace-nowrap`,
                                  )}
                                  onClick={() => setDateEditor({ sessions: rows })}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                  Editar día
                                </button>
                                <button
                                  type="button"
                                  className={cn(
                                    `${trainingSecondary} border-red-800 bg-red-50 text-red-900`,
                                  )}
                                  onClick={() =>
                                    setDateEditor({ sessions: rows, operation: "cancel" })
                                  }
                                >
                                  <Ban className="h-4 w-4" aria-hidden="true" />
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        {canManageAttendance && !s.cancelled && (
                          <div className="flex flex-wrap gap-2">
                            {rows.map((row) => (
                              <Link
                                key={row.id}
                                href={`/attendance/${row.id}?from=admin-trainings` as Route}
                                className={cn(`${trainingSecondary} flex-1 text-sm`)}
                              >
                                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {rows.length > 1
                                  ? `Lista · ${teams.find((t) => t.id === row.team_id)?.label}`
                                  : "Ver asistencia"}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </>
        ) : (
          <>
            {!plans.length && (
              <Empty
                title="Todavía no hay horario semanal"
                action="Crear horario"
                onClick={() => setEditor("new")}
              />
            )}
            {plans.map((rows) => {
              const b = rows[0];
              const canEdit = rows.every((row) => managedTeamIds.includes(row.team_id));
              const slots = [
                ...new Map(
                  rows.map((row) => [`${row.weekdays}/${row.start_time}/${row.end_time}`, row]),
                ).values(),
              ];
              return (
                <article
                  key={b.id}
                  className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white"
                >
                  <header className="bg-pool-deep flex items-center justify-between gap-2 px-4 py-3 text-white">
                    <h2 className="min-w-0 text-lg font-extrabold">
                      {trainingTitle(b.label, b.kind)}
                    </h2>
                    {trainingTitle(b.label, b.kind) !== trainingKindLabel(b.kind) && (
                      <span className="shrink-0 rounded-lg border border-white/70 px-2 py-1 text-sm font-bold">
                        {trainingKindLabel(b.kind)}
                      </span>
                    )}
                  </header>
                  <div className="space-y-3 p-4">
                    <TrainingTeamLabels teams={teams} ids={rows.map((row) => row.team_id)} />
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="border-pool-deep/70 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-blue-50 p-3"
                      >
                        <p className="text-xl font-extrabold tabular-nums">
                          {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                        </p>
                        <p className="font-bold">
                          {slot.weekdays.map((day) => TRAINING_DAYS[day - 1]).join(" · ")}
                        </p>
                      </div>
                    ))}
                    <p className="flex items-start gap-2 font-semibold">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {b.location || "Lugar sin indicar"}
                    </p>
                    <p className="text-sm font-semibold">
                      {trainingDate(b.start_date, true)} — {trainingDate(b.end_date, true)}
                    </p>
                    {!!b.excluded_dates?.length && (
                      <p className="text-sm font-bold">
                        {b.excluded_dates.length} {b.excluded_dates.length === 1 ? "día" : "días"}{" "}
                        de descanso
                      </p>
                    )}
                    {canEdit ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={cn(
                            `${trainingSecondary} bg-blue-50 text-sm whitespace-nowrap`,
                          )}
                          onClick={() => setEditor(rows)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          {b.end_date < trainingDay(new Date()) ? "Renovar" : "Editar"}
                        </button>
                        <button
                          type="button"
                          className={cn(
                            `${trainingSecondary} border-red-800 bg-red-50 text-red-900`,
                          )}
                          onClick={() => {
                            setError(null);
                            setFinish(rows);
                          }}
                        >
                          Finalizar
                        </button>
                      </div>
                    ) : (
                      <p className="border-pool-deep/70 rounded-lg border bg-blue-50 p-3 text-sm font-semibold">
                        Horario conjunto. Puedes cambiar las fechas de tus equipos desde «Fechas».
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </>
        )}
      </div>
      {editor && (
        <TrainingPlanEditor
          teams={managedTeams}
          players={players}
          blocks={editor === "new" ? [] : editor}
          seasonEnd={seasonEnd}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {dateEditor && (
        <TrainingDateEditor
          teams={managedTeams}
          players={players}
          sessions={dateEditor.sessions}
          initialOperation={dateEditor.operation}
          onClose={() => setDateEditor(null)}
          onSaved={saved}
        />
      )}
      <ActaGuardSheet
        open={!!finish}
        onOpenChange={(open) => !open && setFinish(null)}
        context="Horario semanal"
        title="¿Finalizar este horario?"
        body={
          finish && (
            <div className="text-pool-deep space-y-3">
              <TrainingTeamLabels teams={teams} ids={finish.map((b) => b.team_id)} />
              <p className="font-extrabold">{trainingTitle(finish[0].label, finish[0].kind)}</p>
              <p className="rounded-lg border border-red-800 bg-red-50 p-3 font-bold text-red-900">
                Se cancelarán las próximas fechas.
              </p>
              <p className="font-semibold">
                Se conservan los entrenamientos anteriores y la asistencia registrada.
              </p>
            </div>
          )
        }
        summary="Se cancelarán las próximas fechas"
        description="Se conservan los entrenamientos anteriores y la asistencia registrada."
        icon="warning"
        pending={pending}
        error={error}
        actions={[
          {
            label: pending ? "Finalizando…" : "Finalizar horario",
            tone: "danger",
            onClick: retire,
          },
          { label: "Mantener horario", tone: "secondary", onClick: () => setFinish(null) },
        ]}
      />
    </div>
  );
}
function Empty({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return (
    <div className="border-pool-deep/70 space-y-4 rounded-2xl border-2 bg-white p-6 text-center">
      <CalendarClock className="mx-auto h-10 w-10" aria-hidden="true" />
      <h2 className="text-lg font-extrabold">{title}</h2>
      <button
        type="button"
        className={cn(`${trainingSecondary} w-full bg-blue-50`)}
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  );
}

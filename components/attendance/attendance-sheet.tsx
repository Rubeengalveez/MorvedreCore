"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  UsersRound,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { trainingKindLabel } from "@/lib/domain/training-management";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { markAttendance } from "@/server/actions/admin";
import type { DashboardCoachSession } from "@/server/queries/dashboard";

type AttendanceValue = boolean | null;
type AttendanceValues = Record<string, AttendanceValue>;
type SyncState = "pending" | "saving" | "saved" | "error";

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function buildValues(session: DashboardCoachSession, canEdit: boolean): AttendanceValues {
  return Object.fromEntries(
    session.players.map((player) => [player.id, player.attendance ?? (canEdit ? true : null)]),
  );
}

function buildSavedValues(session: DashboardCoachSession): AttendanceValues {
  return Object.fromEntries(session.players.map((player) => [player.id, player.attendance]));
}

function countValues(values: AttendanceValues) {
  const all = Object.values(values);
  const present = all.filter((value) => value === true).length;
  const absent = all.filter((value) => value === false).length;
  return { present, absent };
}

function sameValues(current: AttendanceValues, saved: AttendanceValues): boolean {
  const ids = Object.keys(current);
  return ids.length === Object.keys(saved).length && ids.every((id) => current[id] === saved[id]);
}

export function AttendanceSheet({
  session,
  canEdit,
  origin,
  calendarHref,
}: {
  session: DashboardCoachSession;
  canEdit: boolean;
  origin?: "profile-activity" | "admin-trainings" | "dashboard" | "calendar";
  calendarHref?: string;
}) {
  const router = useRouter();
  const initialValues = useMemo(() => buildValues(session, canEdit), [canEdit, session]);
  const initialSavedValues = useMemo(() => buildSavedValues(session), [session]);
  const [values, setValues] = useState<AttendanceValues>(initialValues);
  const [savedValues, setSavedValues] = useState<AttendanceValues>(initialSavedValues);
  const [syncState, setSyncState] = useState<SyncState>(
    sameValues(initialValues, initialSavedValues) ? "saved" : "pending",
  );
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const requestVersionRef = useRef(0);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const counts = countValues(values);
  const isDirty = !sameValues(values, savedValues);
  const sessionDay = dayKeyFormatter.format(new Date(session.scheduled_at));
  const returnHref =
    origin === "calendar"
      ? (calendarHref ?? "/calendar")
      : origin === "dashboard"
        ? "/dashboard"
        : origin === "admin-trainings"
          ? `/admin/trainings?from=${sessionDay}`
          : `/attendance?date=${sessionDay}${origin ? "&from=profile-activity" : ""}`;

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  function queueSave(nextValues: AttendanceValues) {
    if (!canEdit || session.players.length === 0) return;
    const snapshot = { ...nextValues };
    const version = ++requestVersionRef.current;
    const entries = session.players.map((player) => ({
      player_id: player.id,
      present: snapshot[player.id] === true,
      reason: snapshot[player.id] === false && player.attendance === false ? player.reason : null,
    }));
    setSyncState("saving");
    setError(null);
    const queuedSave = queueRef.current
      .catch(() => undefined)
      .then(() => markAttendance({ session_id: session.id, entries }).then(() => undefined));
    queueRef.current = queuedSave;
    void queuedSave
      .then(() => {
        setSavedValues(snapshot);
        if (version === requestVersionRef.current) setSyncState("saved");
      })
      .catch((caught) => {
        if (version !== requestVersionRef.current) return;
        setSyncState("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "No se ha guardado. Revisa la conexión y vuelve a intentarlo.",
        );
      });
  }

  function markPlayer(playerId: string, attendance: boolean) {
    if (!canEdit || isFinishing || values[playerId] === attendance) return;
    const nextValues = { ...values, [playerId]: attendance };
    setValues(nextValues);
    queueSave(nextValues);
  }

  function retrySave() {
    queueSave(values);
  }

  async function finishAttendance() {
    setIsFinishing(true);
    try {
      if (isDirty && syncState !== "saving") queueSave(values);
      await queueRef.current;
      router.push(returnHref as Route);
    } catch {
      setIsFinishing(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", canEdit && session.players.length > 0 && "pb-32")}>
      <button
        type="button"
        disabled={isFinishing}
        onClick={() => (isDirty ? setLeaveOpen(true) : router.push(returnHref as Route))}
        className="text-pool-blue focus-visible:outline-pool-blue -ml-2 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold focus-visible:outline-2 disabled:opacity-60"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {origin === "calendar"
          ? "Calendario"
          : origin === "dashboard"
            ? "Inicio"
            : "Volver a entrenamientos"}
      </button>
      <header className="border-pool-deep bg-pool-deep overflow-hidden rounded-2xl border-2 px-4 py-3 text-white">
        <p className="text-ball-gold mb-1 text-xs font-extrabold uppercase">Pasar lista</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex min-w-0 items-center gap-2 text-xl leading-6 font-extrabold">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-white"
              style={{ backgroundColor: session.team_color }}
              aria-hidden="true"
            />
            {session.team_label}
          </h1>
          <span className="text-ball-gold shrink-0 text-xl font-extrabold tabular-nums">
            {timeFormatter.format(new Date(session.scheduled_at))}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm font-semibold">
          <span className="capitalize">{dayFormatter.format(new Date(session.scheduled_at))}</span>
          <span className="shrink-0 rounded-lg border border-white/60 bg-white/10 px-2 py-0.5 text-xs">
            {trainingKindLabel(session.kind ?? "water")}
          </span>
        </div>
      </header>
      {session.players.length > 0 && !canEdit ? (
        <>
          <section className="border-pool-deep/65 text-pool-deep flex items-center gap-3 rounded-xl border-2 bg-blue-50 p-3 text-sm font-semibold">
            <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
            Podrás pasar lista el día del entrenamiento.
          </section>
          <h2 className="text-pool-deep px-1 text-base font-extrabold">
            Plantilla · {session.roster_count} jugadores
          </h2>
          <ol
            className="flex flex-col gap-2"
            aria-label={`Plantilla prevista de ${session.team_label}`}
          >
            {session.players.map((player) => (
              <li
                key={player.id}
                className="border-pool-deep/65 text-pool-deep flex min-h-16 items-center rounded-xl border-2 bg-white px-3 py-2 text-base font-bold"
              >
                <AdaptivePlayerName name={player.full_name} />
              </li>
            ))}
          </ol>
        </>
      ) : session.players.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2" aria-label="Asistencia seleccionada">
            <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-green-800 bg-green-50 text-green-900">
              <strong className="text-2xl font-extrabold tabular-nums">{counts.present}</strong>
              <span className="text-sm font-bold">Han venido</span>
            </div>
            <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-red-800 bg-red-50 text-red-900">
              <strong className="text-2xl font-extrabold tabular-nums">{counts.absent}</strong>
              <span className="text-sm font-bold">Han faltado</span>
            </div>
          </div>
          {syncState === "pending" && (
            <p className="border-pool-deep/65 text-pool-deep rounded-xl border bg-blue-50 px-3 py-2.5 text-sm font-semibold">
              Todos preparados en «Sí». Marca «No» si alguien ha faltado.
            </p>
          )}
          <div className="text-pool-deep flex items-center justify-between gap-3 px-1">
            <h2 className="text-base font-extrabold">
              Jugadores <span className="text-sm">({session.roster_count})</span>
            </h2>
            <span className="w-[7.5rem] shrink-0 text-center text-sm font-extrabold">
              ¿Ha venido?
            </span>
          </div>
          <ol className="flex flex-col gap-2" aria-label={`Jugadores de ${session.team_label}`}>
            {session.players.map((player) => {
              const attendance = values[player.id] ?? true;
              return (
                <li
                  key={player.id}
                  className={cn(
                    "flex min-h-20 scroll-mt-24 scroll-mb-56 items-center gap-3 rounded-xl border-2 px-3 py-2 transition-colors motion-reduce:transition-none",
                    attendance ? "border-green-800 bg-green-50" : "border-red-800 bg-red-50",
                  )}
                >
                  <p className="text-pool-deep min-w-0 flex-1 text-base font-extrabold">
                    <AdaptivePlayerName name={player.full_name} />
                  </p>
                  <div
                    role="group"
                    aria-label={`Asistencia de ${player.full_name}`}
                    className="grid w-[7.5rem] shrink-0 grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      aria-pressed={attendance}
                      aria-label={`Ha venido: ${player.full_name}`}
                      disabled={isFinishing}
                      onClick={() => markPlayer(player.id, true)}
                      className={cn(
                        "flex min-h-14 items-center justify-center gap-1 rounded-lg border-2 px-1 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:opacity-60",
                        attendance
                          ? "border-green-800 bg-green-800 text-white"
                          : "border-pool-deep/65 text-pool-deep bg-white",
                      )}
                    >
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Sí
                    </button>
                    <button
                      type="button"
                      aria-pressed={!attendance}
                      aria-label={`No ha venido: ${player.full_name}`}
                      disabled={isFinishing}
                      onClick={() => markPlayer(player.id, false)}
                      className={cn(
                        "flex min-h-14 items-center justify-center gap-1 rounded-lg border-2 px-1 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:opacity-60",
                        !attendance
                          ? "border-red-800 bg-red-800 text-white"
                          : "border-pool-deep/65 text-pool-deep bg-white",
                      )}
                    >
                      <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                      No
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-20 px-4 pb-2 sm:px-6">
            <div className="border-pool-deep/65 text-pool-deep shadow-elev-2 mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl border-2 bg-white p-3">
              <div
                role="status"
                className="flex items-center justify-between gap-2 text-sm font-bold"
              >
                <span
                  className={
                    syncState === "error"
                      ? "text-red-900"
                      : syncState === "saved"
                        ? "text-green-900"
                        : "text-pool-deep"
                  }
                >
                  {syncState === "saved"
                    ? "Lista guardada"
                    : syncState === "saving"
                      ? "Guardando…"
                      : syncState === "error"
                        ? "Sin guardar"
                        : "Lista sin guardar"}
                </span>
                <span className="shrink-0 tabular-nums">
                  {counts.present} sí · {counts.absent} no
                </span>
              </div>
              {syncState === "error" && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-800 bg-red-50 p-2 text-sm"
                >
                  <p className="font-extrabold text-red-900">No se han guardado los cambios</p>
                  <p className="mt-1 font-semibold">{error}</p>
                </div>
              )}
              <button
                type="button"
                onClick={syncState === "error" ? retrySave : finishAttendance}
                disabled={isFinishing}
                className="border-pool-deep bg-pool-deep focus-visible:outline-pool-blue flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                {isFinishing ? (
                  <Loader2
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                )}
                {isFinishing
                  ? "Guardando…"
                  : syncState === "error"
                    ? "Reintentar guardado"
                    : "Guardar lista y volver"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <section className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white px-4 py-7 text-center">
          <UsersRound className="text-pool-blue mx-auto h-10 w-10" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-extrabold">Este equipo no tiene jugadores</h2>
          <p className="mt-2 text-sm font-semibold">Añade la plantilla antes de pasar lista.</p>
        </section>
      )}
      <ActaGuardSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        context="Asistencia"
        title="¿Salir sin guardar la lista?"
        summary="Hay asistencia pendiente de guardar"
        description="Puedes guardar la lista antes de volver o seguir revisándola."
        icon="warning"
        pending={isFinishing || syncState === "saving"}
        error={syncState === "error" ? error : undefined}
        actions={[
          { label: "Guardar y volver", tone: "primary", onClick: finishAttendance },
          { label: "Seguir revisando", tone: "secondary", onClick: () => setLeaveOpen(false) },
          {
            label: "Salir sin guardar",
            tone: "subtle",
            onClick: () => router.push(returnHref as Route),
          },
        ]}
      />
    </div>
  );
}

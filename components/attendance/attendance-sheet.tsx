"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, RefreshCw, UsersRound, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { markAttendance } from "@/server/actions/admin";
import type { DashboardCoachSession } from "@/server/queries/dashboard";

type AttendanceValue = boolean | null;
type AttendanceValues = Record<string, AttendanceValue>;
type SyncState = "saving" | "saved" | "error";

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

function buildValues(session: DashboardCoachSession): AttendanceValues {
  return Object.fromEntries(
    session.players.map((player) => [player.id, player.attendance ?? true]),
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

export function AttendanceSheet({ session }: { session: DashboardCoachSession }) {
  const initialValues = useMemo(() => buildValues(session), [session]);
  const initialSavedValues = useMemo(() => buildSavedValues(session), [session]);
  const [values, setValues] = useState<AttendanceValues>(initialValues);
  const [savedValues, setSavedValues] = useState<AttendanceValues>(initialSavedValues);
  const [syncState, setSyncState] = useState<SyncState>(
    sameValues(initialValues, initialSavedValues) ? "saved" : "saving",
  );
  const [error, setError] = useState<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const requestVersionRef = useRef(0);
  const initialSaveButtonRef = useRef<HTMLButtonElement>(null);
  const initialSaveStartedRef = useRef(false);

  const counts = countValues(values);
  const isDirty = !sameValues(values, savedValues);
  const sessionDay = dayKeyFormatter.format(new Date(session.scheduled_at));

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  function queueSave(nextValues: AttendanceValues) {
    if (session.players.length === 0) return;
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

  useEffect(() => {
    if (initialSaveStartedRef.current) return;
    initialSaveStartedRef.current = true;
    if (isDirty) initialSaveButtonRef.current?.click();
  }, [isDirty]);

  function markPlayer(playerId: string, attendance: boolean) {
    if (values[playerId] === attendance) return;
    const nextValues = { ...values, [playerId]: attendance };
    setValues(nextValues);
    queueSave(nextValues);
  }

  function markEveryonePresent() {
    if (counts.absent === 0) return;
    const nextValues = Object.fromEntries(session.players.map((player) => [player.id, true]));
    setValues(nextValues);
    queueSave(nextValues);
  }

  function retrySave() {
    queueSave(values);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        ref={initialSaveButtonRef}
        type="button"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => queueSave(values)}
      />
      <header className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border px-4 py-4">
        <Link
          href={`/attendance?date=${sessionDay}` as Route}
          className="text-pool-blue focus-visible:ring-pool-blue -ml-2 inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Volver a entrenamientos
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <span
            className="mt-1 h-12 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: session.team_color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
              {dayFormatter.format(new Date(session.scheduled_at))} ·{" "}
              {timeFormatter.format(new Date(session.scheduled_at))}
            </p>
            <h1 className="font-display text-pool-deep mt-1 text-2xl leading-tight font-extrabold">
              {session.team_label}
            </h1>
            <p className="text-ink-600 mt-1 flex items-center gap-2 text-sm font-semibold">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              {session.roster_count} jugadores
            </p>
          </div>
        </div>
      </header>

      {session.players.length > 0 ? (
        <>
          <section
            aria-labelledby="attendance-summary-heading"
            className="border-ink-200 bg-paper-card rounded-2xl border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="attendance-summary-heading" className="text-pool-deep font-extrabold">
                {counts.absent === 0
                  ? "Todo el equipo está presente"
                  : `${counts.absent} ${counts.absent === 1 ? "ausente" : "ausentes"}`}
              </h2>
              <span className="text-ink-600 shrink-0 font-mono text-sm font-extrabold tabular-nums">
                {counts.present}/{session.roster_count}
              </span>
            </div>
            <button
              type="button"
              onClick={markEveryonePresent}
              className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue mt-4 inline-flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 text-base font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            >
              <Check className="h-6 w-6" aria-hidden="true" />
              Marcar todos como presentes
            </button>
            <p className="text-ink-600 mt-2 text-center text-sm leading-relaxed font-semibold">
              Si ha faltado alguien, pulsa «Ausente» junto a su nombre.
            </p>
          </section>

          <div
            className="bg-paper/95 shadow-elev-4 sticky bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-10 rounded-2xl border border-white/90 p-3 backdrop-blur-md"
            aria-live="polite"
          >
            <div className="flex items-center justify-center gap-4 text-sm font-extrabold">
              <span className="text-success inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden="true" />
                {counts.present} presentes
              </span>
              <span className="text-danger inline-flex items-center gap-1.5">
                <X className="h-4 w-4" aria-hidden="true" />
                {counts.absent} ausentes
              </span>
            </div>
            <div className="border-ink-200 mt-2 border-t pt-2">
              {syncState === "saving" ? (
                <p className="text-pool-blue flex items-center justify-center gap-2 font-extrabold">
                  <span
                    className="border-pool-blue h-5 w-5 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Guardando cambios…
                </p>
              ) : syncState === "saved" ? (
                <p className="text-success flex items-center justify-center gap-2 font-extrabold">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Guardado automáticamente
                </p>
              ) : (
                <div role="alert" className="text-center">
                  <p className="text-danger font-extrabold">No se han guardado los cambios</p>
                  <p className="text-ink-600 mt-1 text-xs">{error}</p>
                  <button
                    type="button"
                    onClick={retrySave}
                    className="text-pool-blue focus-visible:ring-pool-blue mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>

          <ol className="flex flex-col gap-3" aria-label={`Jugadores de ${session.team_label}`}>
            {session.players.map((player, index) => {
              const attendance = values[player.id] ?? true;
              return (
                <li
                  key={player.id}
                  className={cn(
                    "rounded-2xl border-2 p-3 transition-[background-color,border-color] motion-reduce:transition-none",
                    attendance ? "border-success/45 bg-success/5" : "border-danger/45 bg-danger/5",
                  )}
                >
                  <div className="flex min-h-12 items-center gap-3 px-1">
                    <span className="bg-pool-foam text-pool-blue flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold tabular-nums">
                      {index + 1}
                    </span>
                    <p className="text-pool-deep min-w-0 flex-1 text-lg leading-tight font-extrabold">
                      {player.full_name}
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label={`Asistencia de ${player.full_name}`}
                    className="mt-2 grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      aria-pressed={attendance}
                      onClick={() => markPlayer(player.id, true)}
                      className={cn(
                        "focus-visible:ring-success inline-flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-xl border-2 px-2 text-base font-extrabold transition-[background-color,border-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
                        attendance
                          ? "border-success bg-success text-paper"
                          : "border-ink-300 bg-paper text-ink-700 hover:border-success hover:text-success",
                      )}
                    >
                      <Check className="h-6 w-6" aria-hidden="true" />
                      Presente
                    </button>
                    <button
                      type="button"
                      aria-pressed={!attendance}
                      onClick={() => markPlayer(player.id, false)}
                      className={cn(
                        "focus-visible:ring-danger inline-flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-xl border-2 px-2 text-base font-extrabold transition-[background-color,border-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
                        !attendance
                          ? "border-danger bg-danger text-paper"
                          : "border-ink-300 bg-paper text-ink-700 hover:border-danger hover:text-danger",
                      )}
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                      Ausente
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <section className="border-ink-200 bg-paper-card rounded-2xl border px-4 py-10 text-center">
          <UsersRound className="text-ink-400 mx-auto h-10 w-10" aria-hidden="true" />
          <h2 className="text-pool-deep mt-3 text-lg font-extrabold">
            Este equipo no tiene jugadores
          </h2>
          <p className="text-ink-600 mt-1 text-sm">Añade la plantilla antes de pasar lista.</p>
        </section>
      )}
    </div>
  );
}

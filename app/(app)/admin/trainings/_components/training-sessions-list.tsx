"use client";

import { CalendarX2, CheckCircle2, ClipboardCheck, Pencil, RotateCcw } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { canEditAttendanceForDay } from "@/lib/domain/attendance";
import { cn } from "@/lib/utils/cn";
import { formatShortDate, formatTime, isPast } from "@/lib/utils/format";
import { uncancelTrainingSession } from "@/server/actions/admin";

import { AttendanceSheet, getSessionLabel, type AttendancePlayer } from "./attendance-sheet";
import { CancelSessionSheet } from "./cancel-session-sheet";
import { TrainingSessionEditSheet } from "./training-session-edit-sheet";

export interface TrainingSessionRow {
  id: string;
  block_id: string | null;
  team_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  maps_url?: string | null;
  cancelled: boolean;
  cancellation_reason: string | null;
}

export function TrainingSessionsList({
  blockLabel,
  sessions,
  roster,
  attendanceBySession,
}: {
  blockLabel: string;
  sessions: TrainingSessionRow[];
  roster: AttendancePlayer[];
  attendanceBySession: Record<string, Record<string, { present: boolean; reason: string | null }>>;
}) {
  if (sessions.length === 0) return null;
  return (
    <ul className="divide-ink-200 divide-y">
      {[...sessions]
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        .map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            label={blockLabel}
            roster={applyAttendance(roster, attendanceBySession[session.id])}
          />
        ))}
    </ul>
  );
}

function SessionRow({
  session,
  label,
  roster,
}: {
  session: TrainingSessionRow;
  label: string;
  roster: AttendancePlayer[];
}) {
  const past = isPast(session.scheduled_at);
  const canEditAttendance = canEditAttendanceForDay(session.scheduled_at);
  return (
    <li className={cn("bg-paper-card px-4 py-4", session.cancelled && "bg-red-50/70")}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-pool-deep font-mono text-xl font-extrabold tabular-nums">
            {formatTime(session.scheduled_at)}
          </p>
          <p className="text-ink-600 text-sm">{session.duration_minutes} min</p>
        </div>
        <p className="text-ink-700 mt-1 text-sm font-semibold">
          {session.location || "Lugar sin indicar"}
        </p>
        {session.cancelled ? (
          <p className="text-goggle-red mt-1 text-sm font-bold">
            Cancelado · {session.cancellation_reason ?? "Sin motivo"}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {session.cancelled ? (
          <UncancelButton sessionId={session.id} />
        ) : (
          <>
            {!past ? (
              <TrainingSessionEditSheet
                session={session}
                trigger={
                  <Button variant="secondary" size="sm" className="min-h-12 flex-1">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar día
                  </Button>
                }
              />
            ) : null}
            <AttendanceAction
              session={session}
              label={label}
              roster={roster}
              canEdit={canEditAttendance}
            />
            {!past ? <CancelAction session={session} /> : null}
          </>
        )}
      </div>
    </li>
  );
}

function AttendanceAction({
  session,
  label,
  roster,
  canEdit,
}: {
  session: TrainingSessionRow;
  label: string;
  roster: AttendancePlayer[];
  canEdit: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={canEdit ? "primary" : "ghost"} size="sm" className="min-h-12 flex-1">
          {canEdit ? (
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {canEdit ? "Pasar lista" : "Ver lista"}
        </Button>
      </SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>{canEdit ? "Pasar lista" : "Plantilla prevista"}</SheetTitle>
          <SheetDescription>
            {formatShortDate(session.scheduled_at)} · {formatTime(session.scheduled_at)} · {label}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <AttendanceSheet
            sessionId={session.id}
            sessionLabel={getSessionLabel(session.scheduled_at, session.location)}
            players={roster}
            canEdit={canEdit}
            onClose={closeOpenSheet}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CancelAction({ session }: { session: TrainingSessionRow }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-goggle-red min-h-12 px-3"
          aria-label="Cancelar este entrenamiento"
        >
          <CalendarX2 className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>Cancelar este entrenamiento</SheetTitle>
          <SheetDescription>
            Solo se cancela este día. El resto del horario continúa igual.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <CancelSessionSheet sessionId={session.id} trigger={null} onDone={closeOpenSheet} />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function UncancelButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      className="min-h-12"
      disabled={pending}
      onClick={() => startTransition(() => uncancelTrainingSession(sessionId))}
    >
      <RotateCcw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden="true" />
      {pending ? "Reactivando…" : "Reactivar"}
    </Button>
  );
}

function applyAttendance(
  players: AttendancePlayer[],
  attendance: Record<string, { present: boolean; reason: string | null }> | undefined,
) {
  if (!attendance) return players;
  return players.map((player) => ({
    ...player,
    present: attendance[player.id]?.present ?? true,
    reason: attendance[player.id]?.reason ?? null,
  }));
}

function closeOpenSheet() {
  document.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')?.click();
}

"use client";

import { MdCheckCircle, MdAssignment, MdAutorenew, MdCancel } from "react-icons/md";
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
import { uncancelTrainingSession } from "@/server/actions/admin";

import { AttendanceSheet, getSessionLabel, type AttendancePlayer } from "./attendance-sheet";
export type { AttendancePlayer } from "./attendance-sheet";
import { CancelSessionSheet } from "./cancel-session-sheet";
import {
  formatShortDate,
  formatTime,
  formatRelativeFromNow,
  isPast,
  formatWeekdayLetter,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface TrainingSessionRow {
  id: string;
  block_id: string | null;
  team_id: string;
  scheduled_at: string;
  location: string | null;
  cancelled: boolean;
  cancellation_reason: string | null;
}

export interface TrainingSessionsListProps {
  blockLabel: string;
  sessions: TrainingSessionRow[];
  roster: AttendancePlayer[];
  attendanceBySession: Record<string, Record<string, { present: boolean; reason: string | null }>>;
}

export function TrainingSessionsList({
  blockLabel,
  sessions,
  roster,
  attendanceBySession,
}: TrainingSessionsListProps) {
  const sorted = [...sessions].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  if (sorted.length === 0) {
    return (
      <p className="text-ink-600 text-sm italic">
        No hay sesiones generadas todavía para este bloque.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((s) => {
        const past = isPast(s.scheduled_at);
        return (
          <li
            key={s.id}
            className={cn(
              "bg-paper flex items-center gap-3 rounded-md border p-3",
              s.cancelled
                ? "border-danger/30 bg-danger/5"
                : past
                  ? "border-ink-300"
                  : "border-pool-teal/40 bg-pool-foam/30",
            )}
          >
            <div className="bg-paper text-pool-deep flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded">
              <span className="text-ink-600 font-mono text-xs leading-none uppercase">
                {formatWeekdayLetter(((new Date(s.scheduled_at).getDay() + 6) % 7) + 1)}
              </span>
              <span className="font-display text-base leading-none font-extrabold">
                {new Date(s.scheduled_at).getDate()}
              </span>
            </div>
            <div className="flex flex-1 flex-col">
              <span className="font-display text-pool-deep text-sm font-bold">{blockLabel}</span>
              <span className="text-ink-600 font-mono text-xs">
                {formatTime(s.scheduled_at)}
                {s.location ? ` · ${s.location}` : ""}
              </span>
              <span className="text-ink-600 text-xs">
                {s.cancelled
                  ? `Cancelada: ${s.cancellation_reason ?? "sin motivo"}`
                  : formatRelativeFromNow(s.scheduled_at)}
              </span>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {s.cancelled ? (
                <UncancelButton sessionId={s.id} />
              ) : (
                <SessionActions
                  sessionId={s.id}
                  scheduledAt={s.scheduled_at}
                  location={s.location}
                  blockLabel={blockLabel}
                  roster={applyAttendance(roster, attendanceBySession[s.id])}
                  past={past}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function applyAttendance(
  roster: AttendancePlayer[],
  attendance: Record<string, { present: boolean; reason: string | null }> | undefined,
): AttendancePlayer[] {
  if (!attendance) return roster;
  return roster.map((p) => {
    const row = attendance[p.id];
    if (!row) return { ...p, present: true, reason: null };
    return { ...p, present: row.present, reason: row.reason };
  });
}

function UncancelButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-success hover:bg-success/10 h-10 w-10 min-w-10 p-0"
      aria-label="Reactivar sesión"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await uncancelTrainingSession(sessionId);
        })
      }
    >
      {pending ? (
        <MdAutorenew className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <MdCheckCircle className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}

function SessionActions({
  sessionId,
  scheduledAt,
  location,
  blockLabel,
  roster,
  past,
}: {
  sessionId: string;
  scheduledAt: string;
  location: string | null;
  blockLabel: string;
  roster: AttendancePlayer[];
  past: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant={past ? "secondary" : "primary"}
            size="sm"
            className="h-10 px-3"
            aria-label="Pasar lista"
          >
            <MdAssignment className="h-4 w-4" aria-hidden="true" />
            Lista
          </Button>
        </SheetTrigger>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>Pasar lista</SheetTitle>
            <SheetDescription>
              {formatShortDate(scheduledAt)} · {formatTime(scheduledAt)} · {blockLabel}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <AttendanceSheet
              sessionId={sessionId}
              sessionLabel={getSessionLabel(scheduledAt, location)}
              players={roster}
              onClose={() => {
                const close = document.querySelector<HTMLButtonElement>(
                  'button[aria-label="Cerrar"]',
                );
                close?.click();
              }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {!past ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10 h-10 w-10 min-w-10 p-0"
              aria-label="Cancelar sesión"
            >
              <MdCancel className="h-4 w-4" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent size="md">
            <SheetHeader>
              <SheetTitle>Cancelar sesión</SheetTitle>
              <SheetDescription>
                Indica el motivo. Los jugadores recibirán un aviso.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <CancelSessionSheet
                sessionId={sessionId}
                trigger={null}
                onDone={() => {
                  const close = document.querySelector<HTMLButtonElement>(
                    'button[aria-label="Cerrar"]',
                  );
                  close?.click();
                }}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

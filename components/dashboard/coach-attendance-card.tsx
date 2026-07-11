"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ClipboardCheck, MapPin } from "lucide-react";

import {
  AttendanceSheet,
  getSessionLabel,
} from "@/app/(app)/admin/trainings/_components/attendance-sheet";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DashboardCoachTask } from "@/server/queries/dashboard";

const dayFormatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export function CoachAttendanceCard({ task }: { task: DashboardCoachTask }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const date = new Date(task.scheduled_at);
  const needsAttention = task.is_past && !task.attendance_recorded;
  const status = task.attendance_recorded
    ? `${task.present_count} de ${task.roster_count} presentes`
    : needsAttention
      ? "La lista está pendiente"
      : "La lista está preparada";

  function closeAndRefresh() {
    setOpen(false);
    router.refresh();
  }

  return (
    <section
      aria-labelledby="coach-task-heading"
      className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
    >
      <div className="flex items-stretch">
        <div
          className="text-paper flex w-[4.75rem] shrink-0 flex-col items-center justify-center px-2 py-5"
          style={{ backgroundColor: task.team_color }}
          aria-hidden="true"
        >
          <span className="font-mono text-3xl leading-none font-extrabold tabular-nums">
            {dayFormatter.format(date)}
          </span>
          <span className="mt-1 text-xs font-extrabold tracking-[0.12em] uppercase">
            {monthFormatter.format(date).replace(".", "")}
          </span>
        </div>

        <div className="min-w-0 flex-1 px-4 py-4">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
            Mesa de entrenador
          </p>
          <h2
            id="coach-task-heading"
            className="font-display text-pool-deep mt-1 text-xl leading-tight font-extrabold text-balance"
          >
            Pasar lista · {task.team_label}
          </h2>
          <p className="text-ink-600 mt-2 text-sm font-semibold capitalize">
            {dateFormatter.format(date)} · {timeFormatter.format(date)}
          </p>
          {task.location ? (
            <p className="text-ink-500 mt-1 flex min-w-0 items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{task.location}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-ink-200 flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className={
              needsAttention
                ? "bg-danger/10 text-danger flex h-9 w-9 items-center justify-center rounded-xl"
                : "bg-success/10 text-success flex h-9 w-9 items-center justify-center rounded-xl"
            }
          >
            {task.attendance_recorded ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-pool-deep text-sm font-extrabold">{status}</p>
            <p className="text-ink-500 text-xs font-semibold">
              {task.roster_count} jugadores en plantilla
            </p>
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              {task.attendance_recorded ? "Revisar lista" : "Pasar lista"}
            </button>
          </SheetTrigger>
          <SheetContent size="full">
            <SheetHeader>
              <SheetTitle>Asistencia de {task.team_label}</SheetTitle>
              <SheetDescription>
                {getSessionLabel(task.scheduled_at, task.location)}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <AttendanceSheet
                sessionId={task.id}
                sessionLabel={getSessionLabel(task.scheduled_at, task.location)}
                players={task.players}
                onClose={closeAndRefresh}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}

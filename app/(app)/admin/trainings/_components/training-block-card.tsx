"use client";

import { MdKeyboardArrowDown, MdKeyboardArrowRight, MdAutorenew, MdPlace } from "react-icons/md";
import { CalendarRange, Clock3, Droplets } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";
import { cn } from "@/lib/utils/cn";
import {
  formatDayMonth,
  formatTimeRange,
  formatWeekdayLetter,
  formatWeekdaysLong,
} from "@/lib/utils/format";
import {
  deleteTrainingBlock,
  generateSessionsFromBlockAction,
  type Team,
} from "@/server/actions/admin";

import { TrainingSessionsList, type TrainingSessionRow } from "./training-sessions-list";
import type { AttendancePlayer } from "./attendance-sheet";

type AttendanceMap = Record<string, Record<string, { present: boolean; reason: string | null }>>;

export interface TrainingBlockCardProps {
  block: {
    id: string;
    label: string;
    weekdays: number[];
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    kind: string;
  };
  team: Pick<Team, "id" | "label" | "color">;
  sessions: TrainingSessionRow[];
  roster: AttendancePlayer[];
  attendanceBySession: AttendanceMap;
  editAction?: React.ReactNode;
}

const KIND_LABELS: Record<string, string> = {
  water: "Agua",
  dry: "Seco",
  physical: "Físico",
  technical: "Técnico",
  mixed: "Mixto",
};

export function TrainingBlockCard({
  block,
  team,
  sessions,
  roster,
  attendanceBySession,
  editAction,
}: TrainingBlockCardProps) {
  const [open, setOpen] = useState(false);
  const [generating, startGenerating] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  function handleGenerate() {
    startGenerating(async () => {
      setGenerateError(null);
      try {
        await generateSessionsFromBlockAction(block.id);
      } catch (caught) {
        setGenerateError(caught instanceof Error ? caught.message : "No pudimos generar las sesiones.");
      }
    });
  }

  function handleDelete() {
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    startDeleting(async () => {
      try {
        await deleteTrainingBlock(block.id);
        setDeleteConfirmOpen(false);
      } catch (caught) {
        setDeleteError(
          caught instanceof Error
            ? caught.message
            : "No pudimos eliminar el bloque de entrenamientos.",
        );
      }
    });
  }

  return (
    <>
      <ConfirmActionSheet
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Terminar horario"
        description={`No se crearán más sesiones para “${block.label}”. Las sesiones y asistencias ya registradas se conservan.`}
        confirmLabel="Sí, terminar horario"
        isPending={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
      />
      <article className="border-ink-200 bg-paper-card shadow-elev-1 relative overflow-hidden rounded-2xl border">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: team.color }} aria-hidden="true" />
        <header className="flex items-start gap-3 px-4 pt-4 pb-3 pl-5">
          <span className="bg-pool-deep text-paper flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <CalendarRange className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ink-600 text-xs font-extrabold tracking-[0.08em] uppercase">{team.label}</p>
            <h3 className="text-pool-deep mt-0.5 text-lg leading-tight font-extrabold">{block.label}</h3>
          </div>
          {editAction}
        </header>

        <div className="bg-pool-deep text-paper mx-3 ml-4 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <Clock3 className="text-ball-gold h-5 w-5" aria-hidden="true" />
            <p className="font-mono text-2xl font-extrabold tabular-nums">
              {formatTimeRange(block.start_time.slice(0, 5), block.end_time.slice(0, 5))}
            </p>
          </div>
          <div className="mt-3 flex gap-1.5" aria-label={formatWeekdaysLong(block.weekdays)}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <span key={day} aria-hidden="true" className={cn("flex h-8 min-w-8 flex-1 items-center justify-center rounded-lg text-xs font-extrabold", block.weekdays.includes(day) ? "bg-paper text-pool-deep" : "border border-paper/20 text-paper/45")}>
                {formatWeekdayLetter(day)}
              </span>
            ))}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-ink-200 mx-3 mt-3 ml-4 overflow-hidden rounded-xl border border-ink-200">
          <div className="bg-paper-card p-3">
            <dt className="text-ink-500 text-[0.6875rem] font-extrabold tracking-wide uppercase">Vigencia</dt>
            <dd className="text-pool-deep mt-1 text-sm font-bold">{formatDayMonth(block.start_date)} – {formatDayMonth(block.end_date)}</dd>
          </div>
          <div className="bg-paper-card p-3">
            <dt className="text-ink-500 text-[0.6875rem] font-extrabold tracking-wide uppercase">Modalidad</dt>
            <dd className="text-pool-deep mt-1 flex items-center gap-1.5 text-sm font-bold"><Droplets className="h-4 w-4" aria-hidden="true" />{KIND_LABELS[block.kind] ?? block.kind}</dd>
          </div>
        </dl>
        {block.location ? <p className="text-ink-700 mx-4 flex items-start gap-2 px-1 py-3 text-sm font-semibold"><MdPlace className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />{block.location}</p> : null}

        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={"schedule-" + block.id} className="bg-pool-ice text-pool-deep flex min-h-14 w-full items-center justify-between gap-2 border-t border-ink-200 px-5 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pool-blue">
          <span>Gestionar sesiones <span className="text-ink-600 font-semibold">({sessions.length})</span></span>
          {open ? <MdKeyboardArrowDown className="h-5 w-5" aria-hidden="true" /> : <MdKeyboardArrowRight className="h-5 w-5" aria-hidden="true" />}
        </button>
        {open && <div id={"schedule-" + block.id} className="border-t border-ink-200">
          <div className="flex flex-wrap gap-2 bg-paper-sunk p-3">
            <Button type="button" variant="secondary" className="min-h-12" onClick={handleGenerate} disabled={generating || deleting}>
              <MdAutorenew className={cn("h-4 w-4", generating && "animate-spin")} aria-hidden="true" />
              {generating ? "Generando…" : "Generar sesiones"}
            </Button>
            <Button type="button" variant="ghost" className="min-h-12 text-danger hover:bg-red-50" onClick={handleDelete} disabled={generating || deleting}>Terminar horario</Button>
          </div>
          {generateError && <p role="alert" className="px-4 py-3 text-sm text-danger">{generateError}</p>}
          <TrainingSessionsList blockLabel={block.label} sessions={sessions} roster={roster} attendanceBySession={attendanceBySession} />
        </div>}
      </article>
    </>
  );
}

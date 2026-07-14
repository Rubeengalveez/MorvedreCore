"use client";

import { MdKeyboardArrowDown, MdKeyboardArrowRight, MdAutorenew, MdPlace } from "react-icons/md";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  formatDayMonth,
  formatTimeRange,
  formatWeekdayLetter,
  formatWeekdaysList,
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

  function handleGenerate() {
    startGenerating(async () => {
      await generateSessionsFromBlockAction(block.id);
    });
  }

  function handleDelete() {
    if (
      !window.confirm(`¿Eliminar el bloque "${block.label}"? Se borrarán sus sesiones futuras.`)
    ) {
      return;
    }
    startDeleting(async () => {
      await deleteTrainingBlock(block.id);
    });
  }

  return (
    <article className="border-ink-300 bg-paper overflow-hidden rounded-md border">
      <div aria-hidden="true" className="h-2 w-full" style={{ backgroundColor: team.color }} />
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex w-full items-center gap-3 text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="text-pool-deep inline-flex h-9 w-9 shrink-0 items-center justify-center rounded">
            {open ? (
              <MdKeyboardArrowDown className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MdKeyboardArrowRight className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-display text-pool-deep text-lg font-extrabold">
              {block.label}
            </span>
            <span className="text-ink-600 text-sm">{team.label}</span>
          </div>
        </button>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const active = block.weekdays.includes(d);
              return (
                <span
                  key={d}
                  aria-hidden="true"
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    active ? "bg-pool-blue text-paper" : "border-ink-300 text-ink-600/40 border",
                  )}
                >
                  {formatWeekdayLetter(d)}
                </span>
              );
            })}
            <span className="sr-only">Días: {formatWeekdaysLong(block.weekdays)}</span>
          </div>
          <div className="text-ink-600 flex flex-col gap-0.5 text-sm">
            <span className="text-pool-deep font-mono font-semibold">
              {formatTimeRange(block.start_time.slice(0, 5), block.end_time.slice(0, 5))}
            </span>
            <span>
              {formatDayMonth(block.start_date)} → {formatDayMonth(block.end_date)}
            </span>
            {block.location ? (
              <span className="flex items-center gap-1">
                <MdPlace className="h-5 w-5 shrink-0" aria-hidden="true" />
                {block.location}
              </span>
            ) : null}
            <span className="border-ink-300 text-ink-600 inline-flex h-6 w-fit items-center rounded-full border px-2 text-xs font-semibold">
              {KIND_LABELS[block.kind] ?? block.kind}
            </span>
          </div>
        </div>

        {open ? (
          <div className="border-ink-300 flex flex-col gap-3 border-t pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {editAction}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerate}
                disabled={generating || deleting}
              >
                {generating ? (
                  <MdAutorenew className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Generar más sesiones
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10"
                onClick={handleDelete}
                disabled={generating || deleting}
              >
                {deleting ? (
                  <MdAutorenew className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Eliminar bloque
              </Button>
            </div>
            <p className="text-ink-600 text-xs">
              Mostrando las próximas sesiones ({sessions.length}). Días del bloque:{" "}
              <span className="font-semibold">{formatWeekdaysList(block.weekdays)}</span>.
            </p>
            <TrainingSessionsList
              blockLabel={block.label}
              sessions={sessions}
              roster={roster}
              attendanceBySession={attendanceBySession}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

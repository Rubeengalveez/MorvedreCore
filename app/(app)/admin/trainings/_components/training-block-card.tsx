"use client";

import { ChevronDown, ChevronRight, Loader2, MapPin } from "lucide-react";
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

import {
  TrainingSessionsList,
  type TrainingSessionRow,
} from "./training-sessions-list";
import type { AttendancePlayer } from "./attendance-sheet";

type AttendanceMap = Record<
  string,
  Record<string, { present: boolean; reason: string | null }>
>;

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
      !window.confirm(
        `¿Eliminar el bloque "${block.label}"? Se borrarán sus sesiones futuras.`,
      )
    ) {
      return;
    }
    startDeleting(async () => {
      await deleteTrainingBlock(block.id);
    });
  }

  return (
    <article className="overflow-hidden rounded-md border border-ink-300 bg-paper">
      <div
        aria-hidden="true"
        className="h-2 w-full"
        style={{ backgroundColor: team.color }}
      />
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-brand-deep">
            {open ? (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-display text-lg font-extrabold text-brand-deep">
              {block.label}
            </span>
            <span className="text-sm text-ink-600">{team.label}</span>
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
                    active
                      ? "bg-brand-blue text-paper"
                      : "border border-ink-300 text-ink-600/40",
                  )}
                >
                  {formatWeekdayLetter(d)}
                </span>
              );
            })}
            <span className="sr-only">
              Días: {formatWeekdaysLong(block.weekdays)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-sm text-ink-600">
            <span className="font-mono font-semibold text-brand-deep">
              {formatTimeRange(
                block.start_time.slice(0, 5),
                block.end_time.slice(0, 5),
              )}
            </span>
            <span>
              {formatDayMonth(block.start_date)} → {formatDayMonth(block.end_date)}
            </span>
            {block.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {block.location}
              </span>
            ) : null}
            <span className="inline-flex h-6 w-fit items-center rounded-full border border-ink-300 px-2 text-[11px] font-semibold text-ink-600">
              {KIND_LABELS[block.kind] ?? block.kind}
            </span>
          </div>
        </div>

        {open ? (
          <div className="flex flex-col gap-3 border-t border-ink-300 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerate}
                disabled={generating || deleting}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Eliminar bloque
              </Button>
            </div>
            <p className="text-xs text-ink-600">
              Mostrando las próximas sesiones ({sessions.length}). Días del
              bloque: <span className="font-semibold">{formatWeekdaysList(block.weekdays)}</span>.
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

"use client";

import { CalendarDays, CalendarPlus, Pencil, Repeat2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatDayMonth, formatTimeRange, formatWeekdaysLong } from "@/lib/utils/format";
import type { Season, Team, TrainingBlockRow, TrainingSessionRow } from "@/server/actions/admin";

import type { AttendancePlayer } from "./attendance-sheet";
import { TrainingBlockFormSheet } from "./training-block-form-sheet";
import { TrainingScheduleFormSheet } from "./training-schedule-form-sheet";
import { TrainingSessionsList } from "./training-sessions-list";

type TeamOption = Team & { season_label: string };
type View = "sessions" | "schedule";

export interface TrainingsListProps {
  seasons: Season[];
  teams: TeamOption[];
  currentSeasonId: string | null;
  defaultTeamId: string | null;
  blocks: TrainingBlockRow[];
  sessionsByBlock: Record<string, TrainingSessionRow[]>;
  rosterByTeam: Record<string, AttendancePlayer[]>;
  attendanceBySession: Record<string, Record<string, { present: boolean; reason: string | null }>>;
}

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function TrainingsList({
  seasons,
  teams,
  currentSeasonId,
  defaultTeamId,
  blocks,
  sessionsByBlock,
  rosterByTeam,
  attendanceBySession,
}: TrainingsListProps) {
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? "");
  const [view, setView] = useState<View>("sessions");
  const team = teams.find((item) => item.id === teamId) ?? teams[0]!;
  const filteredBlocks = blocks.filter((block) => block.team_id === team.id);
  const sessions = filteredBlocks
    .flatMap((block) => (sessionsByBlock[block.id] ?? []).map((session) => ({ session, block })))
    .sort((a, b) => a.session.scheduled_at.localeCompare(b.session.scheduled_at));
  const days = new Map<string, typeof sessions>();
  for (const entry of sessions) {
    const key = dayKey.format(new Date(entry.session.scheduled_at));
    days.set(key, [...(days.get(key) ?? []), entry]);
  }

  return (
    <section className="border-ink-300 bg-paper-card overflow-hidden rounded-2xl border-2">
      <div className="border-ink-300 grid gap-3 border-b-2 p-4 min-[560px]:grid-cols-[1fr_auto] min-[560px]:items-end">
        <label>
          <span className="text-pool-deep mb-1.5 block text-sm font-extrabold">Categoría</span>
          <Select
            value={team.id}
            onChange={(event) => setTeamId(event.target.value)}
            aria-label="Categoría"
            className="h-14 min-h-14 rounded-xl border-2 text-lg font-semibold"
          >
            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </label>
        <TrainingScheduleFormSheet
          key={team.id}
          seasons={seasons.filter((item) => item.id === currentSeasonId)}
          teams={teams}
          defaultTeamId={team.id}
          defaultSeasonId={currentSeasonId}
          trigger={
            <Button size="lg" className="w-full min-[560px]:w-auto">
              <CalendarPlus className="h-5 w-5" aria-hidden="true" />
              Añadir entrenamientos
            </Button>
          }
        />
      </div>

      <div
        className="border-ink-300 grid grid-cols-2 border-b-2"
        role="tablist"
        aria-label="Gestión de entrenamientos"
      >
        <Tab active={view === "sessions"} onClick={() => setView("sessions")} icon={CalendarDays}>
          Sesiones
        </Tab>
        <Tab active={view === "schedule"} onClick={() => setView("schedule")} icon={Repeat2}>
          Horario semanal
        </Tab>
      </div>

      {view === "sessions" ? (
        <div>
          {days.size > 0 ? (
            [...days.entries()].map(([key, entries], index) => (
              <section key={key} className={cn(index > 0 && "border-ink-200 border-t")}>
                <h2 className="border-ink-200 text-pool-deep border-b px-4 py-3 text-sm font-extrabold first-letter:uppercase">
                  {dayLabel.format(new Date(entries[0]!.session.scheduled_at))}
                </h2>
                {entries.map(({ session, block }) => (
                  <TrainingSessionsList
                    key={session.id}
                    blockLabel={team.label}
                    sessions={[session]}
                    roster={rosterByTeam[block.team_id] ?? []}
                    attendanceBySession={attendanceBySession}
                  />
                ))}
              </section>
            ))
          ) : (
            <EmptyState
              title="No hay sesiones próximas"
              actionLabel="Ver horario semanal"
              onAction={() => setView("schedule")}
            />
          )}
        </div>
      ) : (
        <div>
          {filteredBlocks.length > 0 ? (
            <ul className="divide-ink-200 divide-y">
              {filteredBlocks.map((block) => (
                <li key={block.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-pool-deep font-mono text-lg font-extrabold tabular-nums">
                      {formatTimeRange(block.start_time.slice(0, 5), block.end_time.slice(0, 5))}
                    </p>
                    <p className="text-ink-900 mt-1 text-sm font-bold">
                      {formatWeekdaysLong(block.weekdays)}
                    </p>
                    <p className="text-ink-600 mt-1 text-sm">
                      {formatDayMonth(block.start_date)} – {formatDayMonth(block.end_date)}
                      {block.location ? ` · ${block.location}` : ""}
                    </p>
                  </div>
                  <TrainingBlockFormSheet
                    teams={teams}
                    defaultTeamId={block.team_id}
                    defaultSeasonId={currentSeasonId}
                    initial={block}
                    trigger={
                      <Button variant="secondary" size="icon" aria-label="Editar horario">
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Esta categoría no tiene horario" />
          )}
        </div>
      )}
    </section>
  );
}

function Tab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-pool-blue relative flex min-h-14 items-center justify-center gap-2 px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
        active ? "text-pool-blue" : "text-ink-600 hover:text-pool-deep",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
      {active ? <span className="bg-pool-blue absolute inset-x-4 bottom-0 h-0.5" /> : null}
    </button>
  );
}

function EmptyState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <CalendarDays className="text-ink-400 h-8 w-8" aria-hidden="true" />
      <h2 className="text-pool-deep mt-3 font-extrabold">{title}</h2>
      {actionLabel && onAction ? (
        <Button variant="secondary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

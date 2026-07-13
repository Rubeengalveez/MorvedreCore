"use client";

import { Gorro, SilbatoActivo } from "@/components/brand/pictograms";
import { formatLongDate } from "@/lib/domain/calendar";
import type { CalendarEventDay } from "@/server/queries/calendar";
import { TrainingRow, MatchRow } from "./event-sheet";

export interface PoolLaneTimelineProps {
  selectedIso: string;
  day: CalendarEventDay | null;
  isCoach: boolean;
  activeProfileId: string;
  isAdmin: boolean;
  onChanged: () => void;
}

export function PoolLaneTimeline({
  selectedIso,
  day,
  isCoach,
  activeProfileId,
  isAdmin,
  onChanged,
}: PoolLaneTimelineProps) {
  const hasEvents = day && (day.trainings.length > 0 || day.matches.length > 0);
  const dateLabel = formatLongDate(`${selectedIso}T12:00:00`);

  return (
    <div className="flex h-full flex-col transition-[height,opacity,transform] duration-300 ease-out">
      <div className="border-ink-200 mb-3 flex shrink-0 items-center justify-between border-b pb-2">
        <h3 className="font-display text-pool-deep text-sm font-extrabold tracking-wider uppercase">
          {dateLabel}
        </h3>
        <span className="text-eyebrow text-ink-600">
          {hasEvents ? `${day.trainings.length + day.matches.length} evento(s)` : "Sin eventos"}
        </span>
      </div>

      {!hasEvents ? (
        <div className="bg-paper-sunk/30 border-ink-300 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
          <div className="bg-pool-foam text-ink-400 mb-2 flex h-12 w-12 items-center justify-center rounded-full">
            <SilbatoActivo className="h-6 w-6 opacity-40" accent="var(--pool-teal)" />
          </div>
          <p className="text-ink-900 text-sm font-semibold">Nada en el calendario este día</p>
          <p className="text-ink-600 mt-1 max-w-[240px] text-xs">
            Aprovéchalo para descansar o ponerte al día.
          </p>
        </div>
      ) : (
        <div className="scrollbar-hide relative flex-1 overflow-y-auto pr-1 pb-4">
          {/* Pool Lane Divider Line (Alternating floats visual: blue, white, red, white) */}
          <div className="pointer-events-none absolute top-3 bottom-3 left-[17px] z-0 w-1.5 overflow-hidden rounded-full">
            <div className="h-full w-full bg-[repeating-linear-gradient(to_bottom,var(--pool-blue)_0px,var(--pool-blue)_12px,#e2e8f0_12px,#e2e8f0_24px,var(--goggle-red)_24px,var(--goggle-red)_36px,#e2e8f0_36px,#e2e8f0_48px)] opacity-50" />
          </div>

          <ul className="relative z-10 flex flex-col gap-4">
            {day.trainings.map((t) => (
              <li key={t.id} className="group flex items-start gap-3">
                {/* Timeline Node Icon */}
                <div
                  className="bg-paper-card shadow-elev-2 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105"
                  style={{ borderColor: t.team_color || "var(--pool-teal)" }}
                >
                  <SilbatoActivo
                    className="h-4.5 w-4.5"
                    accent={t.team_color || "var(--pool-teal)"}
                  />
                </div>
                {/* Card Container */}
                <div className="min-w-0 flex-1 transition-transform duration-200 group-hover:translate-x-0.5">
                  <TrainingRow training={t} isCoach={isCoach || isAdmin} />
                </div>
              </li>
            ))}

            {day.matches.map((m) => (
              <li key={m.id} className="group flex items-start gap-3">
                {/* Timeline Node Icon */}
                <div
                  className="bg-paper-card shadow-elev-2 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105"
                  style={{ borderColor: m.team_color || "var(--ball-gold)" }}
                >
                  <Gorro
                    className="h-5 w-5"
                    accent={
                      m.cap_number != null ? "var(--pool-blue)" : m.team_color || "var(--pool-teal)"
                    }
                  />
                </div>
                {/* Card Container */}
                <div className="min-w-0 flex-1 transition-transform duration-200 group-hover:translate-x-0.5">
                  <MatchRow
                    match={m}
                    isCoach={isCoach || isAdmin}
                    activeProfileId={activeProfileId}
                    onChanged={onChanged}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

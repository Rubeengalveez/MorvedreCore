import { cn } from "@/lib/utils/cn";

export type PoolScoreboardMode = "preview" | "live" | "final";

export interface PoolScoreboardProps {
  mode: PoolScoreboardMode;
  homeTeam: { label: string; color: string };
  awayTeam: { label: string; color: string };
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt: string;
  competitionLabel: string;
  isHome?: boolean;
  period?: number | null;
  clock?: string | null;
  mvp?: { name: string; cap?: number | null } | null;
  location?: string | null;
  className?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function shortLabel(label: string): string {
  return label.length > 10 ? label.slice(0, 10) : label;
}

export function PoolScoreboard({
  mode,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  scheduledAt,
  competitionLabel,
  isHome = true,
  period = null,
  clock = null,
  mvp = null,
  location = null,
  className,
}: PoolScoreboardProps) {
  const showScore = mode === "final" || mode === "live";
  const showTime = mode === "preview";
  return (
    <article
      data-pool-scoreboard
      data-mode={mode}
      className={cn(
        "relative overflow-hidden rounded-md border border-ink-300 bg-paper-card text-ink-900 shadow-elev-2",
        className,
      )}
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: homeTeam.color }} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1.5" style={{ backgroundColor: awayTeam.color }} />

      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ backgroundColor: isHome ? homeTeam.color : awayTeam.color }}
      />

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <TeamSide
          label={homeTeam.label}
          color={homeTeam.color}
          isHome={isHome}
          showScore={showScore}
          score={homeScore}
          side="home"
        />

        <Center
          mode={mode}
          scheduledAt={scheduledAt}
          showTime={showTime}
          period={period}
          clock={clock}
        />

        <TeamSide
          label={awayTeam.label}
          color={awayTeam.color}
          isHome={!isHome}
          showScore={showScore}
          score={awayScore}
          side="away"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-300 bg-pool-foam/40 px-3 py-2">
        <span className="text-eyebrow text-ink-600">{competitionLabel}</span>
        {location ? (
          <span className="text-[11px] font-medium text-ink-600">· {location}</span>
        ) : null}
        {mvp ? (
          <span className="ml-auto text-[11px] font-semibold text-pool-deep">
            MVP: {mvp.name}
            {mvp.cap != null ? ` #${mvp.cap}` : ""}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function TeamSide({
  label,
  color,
  isHome,
  showScore,
  score,
  side,
}: {
  label: string;
  color: string;
  isHome: boolean;
  showScore: boolean;
  score: number | null | undefined;
  side: "home" | "away";
}) {
  return (
    <div
      data-team-side={side}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 px-3 py-4",
        side === "home" ? "items-start text-left" : "items-end text-right",
      )}
    >
      <span
        className="text-eyebrow"
        style={{ color }}
      >
        {shortLabel(label)} {isHome ? "(L)" : "(V)"}
      </span>
      {showScore ? (
        <span className="font-mono text-4xl font-extrabold leading-none tabular-nums text-pool-deep sm:text-[56px]">{score ?? 0}</span>
      ) : (
        <span className="font-display text-base font-extrabold leading-tight text-pool-deep line-clamp-2">
          {shortLabel(label)}
        </span>
      )}
    </div>
  );
}

function Center({
  mode,
  scheduledAt,
  showTime,
  period,
  clock,
}: {
  mode: PoolScoreboardMode;
  scheduledAt: string;
  showTime: boolean;
  period: number | null;
  clock: string | null;
}) {
  return (
    <div
      className="flex min-w-[80px] flex-col items-center justify-center gap-0.5 border-x border-ink-200 px-2 py-3"
      aria-live="polite"
    >
      {mode === "preview" && showTime ? (
        <>
          <span className="text-eyebrow text-ink-500">vs</span>
          <span className="font-mono text-2xl font-extrabold leading-none tabular-nums text-pool-deep sm:text-[40px]">
            {formatTime(scheduledAt)}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">
            {formatDateShort(scheduledAt)}
          </span>
        </>
      ) : null}
      {mode === "live" ? (
        <>
          <span
            data-live-badge
            className="live-badge-pulse inline-flex h-5 items-center rounded-sm bg-goggle-red px-1.5 text-[10px] font-extrabold uppercase tracking-eyebrow text-paper"
          >
            En vivo
          </span>
          <span className="font-mono text-2xl font-extrabold leading-none tabular-nums text-pool-deep sm:text-[40px]">
            {clock ?? "00:00"}
          </span>
          <span className="text-eyebrow text-ink-600">{period ?? 1}º P</span>
        </>
      ) : null}
      {mode === "final" ? (
        <>
          <span className="text-eyebrow text-success">Final</span>
          <span className="text-eyebrow text-ink-600">vs</span>
        </>
      ) : null}
    </div>
  );
}

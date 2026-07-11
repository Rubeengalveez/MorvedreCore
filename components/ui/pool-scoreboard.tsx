import { cn } from "@/lib/utils/cn";

export type PoolScoreboardMode = "preview" | "live" | "final";
export type PoolScoreboardOutcome = "win" | "draw" | "loss";

export interface PoolScoreboardProps {
  mode: PoolScoreboardMode;
  homeTeam: { label: string; color: string };
  awayTeam: { label: string; color: string };
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt: string;
  competitionLabel: string;
  outcome?: PoolScoreboardOutcome | null;
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

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

const outcomeCopy: Record<PoolScoreboardOutcome, string> = {
  win: "Victoria",
  draw: "Empate",
  loss: "Derrota",
};

export function PoolScoreboard({
  mode,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  scheduledAt,
  competitionLabel,
  outcome = null,
  isHome,
  period = null,
  clock = null,
  mvp = null,
  location = null,
  className,
}: PoolScoreboardProps) {
  const showScore = mode === "final" || mode === "live";
  const resolvedOutcome =
    outcome ??
    (mode === "final" && isHome != null && homeScore != null && awayScore != null
      ? isHome
        ? homeScore > awayScore
          ? "win"
          : homeScore < awayScore
            ? "loss"
            : "draw"
        : awayScore > homeScore
          ? "win"
          : awayScore < homeScore
            ? "loss"
            : "draw"
      : null);

  return (
    <article
      data-pool-scoreboard
      data-mode={mode}
      className={cn(
        "border-ink-200 bg-paper-card text-ink-900 shadow-elev-1 hover:shadow-elev-2 overflow-hidden rounded-2xl border transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none",
        className,
      )}
    >
      <header className="border-ink-200 flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-pool-deep text-xs font-extrabold tracking-wide uppercase">
            {competitionLabel}
          </p>
          <p className="text-ink-600 mt-0.5 truncate text-sm font-medium">
            {formatDate(scheduledAt)}
            {location ? ` · ${location}` : ""}
          </p>
        </div>
        {mode === "final" && resolvedOutcome ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-wide uppercase",
              resolvedOutcome === "win" && "bg-success/15 text-success",
              resolvedOutcome === "draw" && "bg-ink-200 text-ink-700",
              resolvedOutcome === "loss" && "bg-goggle-red/12 text-goggle-red",
            )}
          >
            {outcomeCopy[resolvedOutcome]}
          </span>
        ) : null}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 py-4 sm:px-5">
        <TeamScore
          label={homeTeam.label}
          color={homeTeam.color}
          venue="Local"
          score={homeScore}
          showScore={showScore}
          align="left"
        />
        <MatchCenter mode={mode} scheduledAt={scheduledAt} period={period} clock={clock} />
        <TeamScore
          label={awayTeam.label}
          color={awayTeam.color}
          venue="Visitante"
          score={awayScore}
          showScore={showScore}
          align="right"
        />
      </div>

      {mvp ? (
        <footer className="border-ink-200 bg-pool-foam/45 text-ink-700 border-t px-4 py-2.5 text-sm">
          MVP: <span className="text-pool-deep font-bold">{mvp.name}</span>
          {mvp.cap != null ? ` #${mvp.cap}` : ""}
        </footer>
      ) : null}
    </article>
  );
}

function TeamScore({
  label,
  color,
  venue,
  score,
  showScore,
  align,
}: {
  label: string;
  color: string;
  venue: string;
  score: number | null | undefined;
  showScore: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        align === "left" ? "items-start text-left" : "items-end text-right",
      )}
    >
      <span className="text-ink-500 text-[11px] font-bold tracking-wide uppercase">{venue}</span>
      <span
        className="flex max-w-full items-center gap-1.5 text-sm font-extrabold sm:text-base"
        style={{ color }}
      >
        {align === "left" ? (
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
        ) : null}
        <span className="truncate">{label}</span>
        {align === "right" ? (
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
        ) : null}
      </span>
      {showScore ? (
        <span className="text-pool-deep font-mono text-5xl leading-none font-extrabold tabular-nums sm:text-6xl">
          {score ?? 0}
        </span>
      ) : null}
    </div>
  );
}

function MatchCenter({
  mode,
  scheduledAt,
  period,
  clock,
}: {
  mode: PoolScoreboardMode;
  scheduledAt: string;
  period: number | null;
  clock: string | null;
}) {
  if (mode === "preview") {
    return (
      <div className="text-pool-deep flex min-w-14 flex-col items-center px-3 text-center">
        <span className="text-ink-500 text-[11px] font-bold tracking-wide uppercase">Hora</span>
        <span className="font-mono text-xl font-extrabold tabular-nums">
          {formatTime(scheduledAt)}
        </span>
      </div>
    );
  }

  if (mode === "live") {
    return (
      <div className="text-goggle-red flex min-w-14 flex-col items-center px-3 text-center">
        <span className="text-[11px] font-extrabold tracking-wide uppercase">En vivo</span>
        <span className="font-mono text-lg font-extrabold tabular-nums">{clock ?? "00:00"}</span>
        <span className="text-ink-500 text-[10px] font-bold">{period ?? 1}º periodo</span>
      </div>
    );
  }

  return <span className="text-ink-400 px-3 text-sm font-extrabold">vs</span>;
}

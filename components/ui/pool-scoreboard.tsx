import { cn } from "@/lib/utils/cn";

export type PoolScoreboardMode = "preview" | "live" | "final";
export type PoolScoreboardOutcome = "win" | "draw" | "loss";

export interface PoolScoreboardProps {
  mode: PoolScoreboardMode;
  homeTeam: { label: string; color: string };
  awayTeam: { label: string; color: string };
  homeScore?: number | null;
  awayScore?: number | null;
  regulationScore?: { home: number; away: number } | null;
  scheduledAt: string;
  competitionLabel: string;
  outcome?: PoolScoreboardOutcome | null;
  isHome?: boolean;
  period?: number | null;
  mvp?: {
    name: string;
    cap?: number | null;
    goals?: number;
    assists?: number;
  } | null;
  location?: string | null;
  className?: string;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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
  regulationScore,
  scheduledAt,
  competitionLabel,
  outcome = null,
  isHome,
  period = null,
  mvp = null,
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
  const statusLabel =
    mode === "live"
      ? "En juego"
      : mode === "final" && resolvedOutcome
        ? outcomeCopy[resolvedOutcome]
        : "Programado";
  const statusTone =
    mode === "final" && resolvedOutcome === "win"
      ? "bg-success text-pool-deep"
      : mode === "final" && resolvedOutcome === "loss"
        ? "bg-goggle-red text-paper"
        : mode === "final" && resolvedOutcome === "draw"
          ? "bg-ball-gold text-pool-deep"
          : "bg-paper/15 text-paper";

  return (
    <article
      data-pool-scoreboard
      data-mode={mode}
      className={cn(
        "bg-paper-card text-ink-900 shadow-elev-1 overflow-hidden rounded-2xl",
        className,
      )}
    >
      <header className="bg-pool-deep text-paper grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5">
        <p className="font-display min-w-0 truncate text-sm font-extrabold tracking-wide uppercase">
          {competitionLabel}
        </p>
        <time dateTime={scheduledAt} className="text-sm font-semibold whitespace-nowrap">
          {formatDate(scheduledAt)}
        </time>
        <span
          className={cn(
            "col-span-2 justify-self-center rounded-full px-3 py-0.5 text-sm font-bold",
            statusTone,
          )}
        >
          {statusLabel}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] items-center gap-x-2 px-3 py-3 text-center sm:px-5">
        <TeamScore
          label={homeTeam.label}
          venue="Local"
          score={regulationScore?.home ?? homeScore}
          showScore={showScore}
          align="left"
        />
        <MatchCenter mode={mode} period={period} />
        <TeamScore
          label={awayTeam.label}
          venue="Visitante"
          score={regulationScore?.away ?? awayScore}
          showScore={showScore}
          align="right"
        />
      </div>

      {regulationScore && (
        <p className="text-pool-deep pb-3 text-center text-sm font-bold">
          ({homeScore}–{awayScore}) <span className="text-ink-600 font-medium">con penaltis</span>
        </p>
      )}
      {mvp ? (
        <footer className="border-ink-200 bg-paper-sunk/65 text-ink-600 flex min-w-0 items-center gap-1.5 overflow-hidden border-t px-4 py-2 text-xs whitespace-nowrap sm:text-sm">
          <span className="min-w-0 truncate">
            MVP: <strong className="text-pool-deep">{mvp.name}</strong>
            {mvp.cap != null ? ` #${mvp.cap}` : ""}
          </span>
          {(mvp.goals ?? 0) > 0 || (mvp.assists ?? 0) > 0 ? (
            <span className="text-ink-500 shrink-0 font-semibold">
              · {mvp.goals ?? 0} {(mvp.goals ?? 0) === 1 ? "gol" : "goles"} · {mvp.assists ?? 0}{" "}
              asist.
            </span>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function TeamScore({
  label,
  venue,
  score,
  showScore,
  align,
}: {
  label: string;
  venue: string;
  score: number | null | undefined;
  showScore: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-rows-[auto_auto_auto] justify-items-center",
        align === "left" ? "col-start-1" : "col-start-3",
      )}
    >
      <span className="text-ink-600 text-sm">{venue}</span>
      <span className="font-display text-pool-deep max-w-full truncate text-base leading-snug font-extrabold sm:text-lg">
        {label}
      </span>
      <span className="text-pool-deep mt-1 font-mono text-6xl leading-none font-extrabold tracking-tight tabular-nums">
        {showScore ? (score ?? 0) : "–"}
      </span>
    </div>
  );
}

function MatchCenter({ mode, period }: { mode: PoolScoreboardMode; period: number | null }) {
  if (mode === "live") {
    return (
      <div className="text-ink-600 col-start-2 flex h-[3.75rem] -translate-y-6 items-center justify-center self-end text-center text-xs font-bold whitespace-nowrap">
        {period ?? 1}º periodo
      </div>
    );
  }

  return <span className="text-ink-400 col-start-2 text-xl">{mode === "final" ? "–" : "vs"}</span>;
}

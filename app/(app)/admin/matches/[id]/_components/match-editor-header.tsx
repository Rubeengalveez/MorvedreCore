import { cn } from "@/lib/utils/cn";

interface MatchEditorHeaderProps {
  teamLabel: string;
  opponent: string;
  isHome: boolean;
  scheduledAt: string;
  competitionLabel: string;
  status: string;
  scoreUs: number | null;
  scoreThem: number | null;
  regulationScore?: { home: number; away: number } | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  played: "Jugado",
  cancelled: "Cancelado",
  postponed: "Aplazado",
};

export function MatchEditorHeader({
  teamLabel,
  opponent,
  isHome,
  scheduledAt,
  competitionLabel,
  status,
  scoreUs,
  scoreThem,
  regulationScore,
}: MatchEditorHeaderProps) {
  const hasResult = status === "played" && scoreUs != null && scoreThem != null;
  const date = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(scheduledAt));
  const resultLabel = hasResult
    ? scoreUs > scoreThem
      ? "Victoria"
      : scoreUs < scoreThem
        ? "Derrota"
        : "Empate"
    : (STATUS_LABELS[status] ?? status);
  const homeLabel = isHome ? teamLabel : opponent;
  const awayLabel = isHome ? opponent : teamLabel;
  const homeScore = isHome ? scoreUs : scoreThem;
  const awayScore = isHome ? scoreThem : scoreUs;
  const outcomeTone = hasResult
    ? scoreUs > scoreThem
      ? "bg-success text-pool-deep"
      : scoreUs < scoreThem
        ? "bg-goggle-red text-paper"
        : "bg-ball-gold text-pool-deep"
    : "bg-paper/15 text-paper";

  return (
    <header className="bg-paper-card overflow-hidden rounded-2xl">
      <div className="bg-pool-deep text-paper relative flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-extrabold tracking-wide uppercase">
            {competitionLabel}
          </span>
        </div>
        <span
          className={cn(
            "absolute left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-sm font-bold",
            outcomeTone,
          )}
        >
          {resultLabel}
        </span>
        <time dateTime={scheduledAt} className="text-sm font-medium whitespace-nowrap">
          {date}
        </time>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 px-3 py-3 text-center sm:px-5">
        <div className="col-start-1 row-start-1 min-w-0 self-start">
          <p className="text-ink-600 mb-0.5 text-sm">Local</p>
          <p className="font-display text-pool-deep text-base leading-snug font-extrabold break-words sm:text-lg">
            {homeLabel}
          </p>
        </div>
        <div className="col-start-3 row-start-1 min-w-0 self-start">
          <p className="text-ink-600 mb-0.5 text-sm">Visitante</p>
          <p className="font-display text-pool-deep text-base leading-snug font-extrabold break-words sm:text-lg">
            {awayLabel}
          </p>
        </div>
        <span
          className="text-pool-deep col-start-1 row-start-2 font-mono text-6xl leading-none font-extrabold tracking-tight tabular-nums"
          aria-label={hasResult ? `Local: ${homeScore} goles` : "Local: resultado pendiente"}
        >
          {hasResult ? regulationScore?.home ?? homeScore : "–"}
        </span>
        <span className="text-ink-400 col-start-2 row-start-2 text-xl" aria-hidden="true">
          {hasResult ? "–" : "vs"}
        </span>
        <span
          className="text-pool-deep col-start-3 row-start-2 font-mono text-6xl leading-none font-extrabold tracking-tight tabular-nums"
          aria-label={hasResult ? `Visitante: ${awayScore} goles` : "Visitante: resultado pendiente"}
        >
          {hasResult ? regulationScore?.away ?? awayScore : "–"}
        </span>
      </div>
      {hasResult && regulationScore && <p className="pb-3 text-center text-sm font-bold text-pool-deep">({homeScore}–{awayScore}) <span className="font-medium text-ink-600">con penaltis</span></p>}
    </header>
  );
}

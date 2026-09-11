import { ArrowLeft, Share2 } from "lucide-react";
import { score, type LiveRecord } from "@/lib/domain/live-match";

export function ActaScoreboard({
  record,
  status,
  onShare,
}: {
  record: LiveRecord;
  status: string;
  onShare: () => void;
}) {
  const s = record.sheet;
  return (
    <header className="shrink-0 bg-[#062048] pt-[env(safe-area-inset-top)] text-white shadow-[0_4px_18px_rgba(6,32,72,0.2)]">
      <div data-acta-navigation className="flex min-h-12 items-center px-1.5">
        <a
          href={`/matches/${record.matchId}`}
          aria-label="Volver al partido"
          className="grid min-h-12 min-w-12 place-items-center rounded-xl active:bg-white/15"
        >
          <ArrowLeft size={23} strokeWidth={2.25} aria-hidden="true" />
        </a>
        <h1 className="min-w-0 flex-1 text-base font-extrabold tracking-tight">Acta en directo</h1>
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartir acta"
          className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold active:bg-white/15"
        >
          <Share2 size={20} strokeWidth={2.25} aria-hidden="true" />
          <span className="max-[359px]:sr-only">Compartir</span>
        </button>
      </div>
      <div
        data-acta-score
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 pb-2"
      >
        <span className="truncate text-center text-sm font-bold min-[390px]:text-base">
          Morvedre
        </span>
        <strong
          data-acta-score-number
          className="justify-self-center text-center font-mono text-[2.5rem] leading-none font-black tracking-tight whitespace-nowrap tabular-nums min-[390px]:text-5xl"
          aria-label={`Morvedre ${score(s, "us")}, ${record.opponent} ${score(s, "them")}`}
        >
          {score(s, "us")}
          <span className="px-2 text-xl font-medium text-blue-200">–</span>
          {score(s, "them")}
        </strong>
        <span
          data-acta-rival-name
          className="line-clamp-2 text-center text-sm leading-tight font-bold min-[390px]:text-base"
          title={record.opponent}
        >
          {record.opponent}
        </span>
      </div>
      <div
        data-acta-meta
        className="grid min-h-9 grid-cols-[auto_1fr] items-center gap-x-3 border-t border-white/15 px-3 text-sm text-blue-50"
      >
        <span className="font-bold">
          {s.phase === "finished"
            ? "Partido terminado"
            : `Cuarto ${s.period}/${s.periods}${s.phase === "break" ? " · Descanso" : ""}`}
          {s.phase !== "finished" && (
            <span className="font-medium text-blue-200">
              {" "}
              · Parcial {score(s, "us", s.period)}–{score(s, "them", s.period)}
            </span>
          )}
        </span>
        <span
          className="truncate text-right text-xs font-semibold text-blue-100"
          role="status"
          aria-live="polite"
        >
          {status}
        </span>
      </div>
    </header>
  );
}

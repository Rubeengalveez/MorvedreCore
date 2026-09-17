import { ArrowLeft, Share2 } from "lucide-react";
import { finalScore, score, type LiveRecord, type Side } from "@/lib/domain/live-match";

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
  const left: Side = record.homeAway === "away" ? "them" : "us";
  const right: Side = left === "us" ? "them" : "us";
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
        {s.phase === "finished" ? (
          <button
            type="button"
            onClick={onShare}
            aria-label="Compartir acta"
            className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold active:bg-white/15"
          >
            <Share2 size={20} strokeWidth={2.25} aria-hidden="true" />
            <span className="max-[359px]:sr-only">Compartir</span>
          </button>
        ) : (
          <span className="h-12 w-12" aria-hidden="true" />
        )}
      </div>
      <div
        data-acta-score
        className="px-4 pb-2"
        aria-label={`Morvedre ${score(s, "us")}, ${record.opponent} ${score(s, "them")}`}
      >
        <div className="grid grid-cols-2 items-end gap-7 px-1 text-center">
          <span
            className="line-clamp-2 min-w-0 text-sm leading-4 font-bold text-blue-50 min-[390px]:text-[15px]"
            title={left === "us" ? "Morvedre" : record.opponent}
          >
            {left === "us" ? "Morvedre" : record.opponent}
          </span>
          <span
            className="line-clamp-2 min-w-0 text-sm leading-4 font-bold text-blue-50 min-[390px]:text-[15px]"
            title={right === "us" ? "Morvedre" : record.opponent}
          >
            {right === "us" ? "Morvedre" : record.opponent}
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-[1fr_1.5rem_1fr] items-center text-center">
          <strong className="font-mono text-[3.25rem] leading-[0.95] font-black tracking-tighter tabular-nums min-[390px]:text-[3.5rem]">
            {score(s, left)}
          </strong>
          <span className="pb-1 text-xl font-medium text-blue-300" aria-hidden="true">
            –
          </span>
          <strong className="font-mono text-[3.25rem] leading-[0.95] font-black tracking-tighter tabular-nums min-[390px]:text-[3.5rem]">
            {score(s, right)}
          </strong>
        </div>
        {s.shootout && (
          <div className="-mt-0.5 text-center text-base leading-none font-extrabold text-blue-100">
            ({finalScore(s, left)}–{finalScore(s, right)})
          </div>
        )}
      </div>
      <div
        data-acta-meta
        className="grid min-h-9 grid-cols-[auto_1fr] items-center gap-x-3 border-t border-white/15 px-3 text-sm text-blue-50"
      >
        <span className="font-bold">
          {s.phase === "finished"
            ? "Partido terminado"
            : s.phase === "shootout"
              ? "Tanda de penaltis"
              : `Cuarto ${s.period}/${s.periods}${s.phase === "break" ? " · Descanso" : ""}`}
          {s.phase !== "finished" && s.phase !== "shootout" && (
            <span className="font-medium text-blue-200">
              {" "}
              · Parcial {score(s, left, s.period)}–{score(s, right, s.period)}
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

import { ArrowLeft, ListChecks, Share2 } from "lucide-react";
import { finalScore, score, type LiveRecord, type Side } from "@/lib/domain/live-match";

export function ActaScoreboard({
  record,
  status,
  onShare,
  onBack,
  onParticipation,
}: {
  record: LiveRecord;
  status: string;
  onShare: () => void;
  onBack: () => void;
  onParticipation?: () => void;
}) {
  const s = record.sheet;
  const left: Side = record.homeAway === "away" ? "them" : "us";
  const right: Side = left === "us" ? "them" : "us";
  const compactStatus = status.startsWith("Sin conexión")
    ? "Sin conexión"
    : status.includes("Enviando")
      ? "Enviando…"
      : status;
  return (
    <header className="shrink-0 bg-[#062048] pt-[env(safe-area-inset-top)] text-white shadow-[0_4px_18px_rgba(6,32,72,0.2)]">
      <div data-acta-navigation className="flex min-h-12 items-center px-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al partido"
          className="grid min-h-12 min-w-12 place-items-center rounded-xl active:bg-white/15"
        >
          <ArrowLeft size={23} strokeWidth={2.25} aria-hidden="true" />
        </button>
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
        ) : onParticipation ? (
          <button
            type="button"
            onClick={onParticipation}
            aria-label="Revisar participación"
            title="Cuartos jugados"
            className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border border-white/60 px-2 text-sm font-bold active:bg-white/15"
          >
            <ListChecks size={21} aria-hidden="true" />
            <span className="max-[359px]:sr-only">Cuartos</span>
          </button>
        ) : (
          <span className="h-12 w-12" aria-hidden="true" />
        )}
      </div>
      <div
        data-acta-score
        className="px-4 pb-2"
        role="group"
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
        className="flex min-h-9 items-center justify-between gap-2 overflow-hidden px-3 py-2 text-sm whitespace-nowrap text-blue-50"
      >
        <span className="min-w-0 flex-1 truncate font-bold">
          {s.phase === "finished" ? (
            "Partido terminado"
          ) : s.phase === "shootout" ? (
            "Tanda de penaltis"
          ) : (
            <>
              <span data-acta-meta-word>Cuarto </span>
              {s.period}/{s.periods}
              {s.phase === "break" ? " · Descanso" : ""}
            </>
          )}
          {s.phase !== "finished" && s.phase !== "shootout" && (
            <span className="font-medium text-blue-200">
              {" "}
              · <span data-acta-meta-word>Parcial </span>
              {score(s, left, s.period)}–{score(s, right, s.period)}
            </span>
          )}
        </span>
        <span
          className="max-w-[40%] shrink-0 truncate text-right text-sm font-semibold text-blue-100"
          role="status"
          aria-live="polite"
          title={status}
          aria-label={status}
        >
          {compactStatus}
        </span>
      </div>
    </header>
  );
}

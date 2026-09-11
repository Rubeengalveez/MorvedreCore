import { timeoutCount, type LiveSheet, type Side } from "@/lib/domain/live-match";

export function ActaMatchControls({
  sheet,
  playing,
  onTeam,
  onBench,
  onHistory,
  onPeriods,
}: {
  sheet: LiveSheet;
  playing: boolean;
  onTeam: (team: Side) => void;
  onBench: () => void;
  onHistory: () => void;
  onPeriods: () => void;
}) {
  return (
    <>
      <div data-acta-teams className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!playing}
          onClick={() => onTeam("us")}
          className="min-h-14 rounded-xl border border-white/30 bg-[#1657a8] px-3 text-lg font-black text-white shadow-sm active:bg-[#083c69] disabled:opacity-45"
        >
          Morvedre
        </button>
        <button
          type="button"
          disabled={!playing}
          onClick={() => onTeam("them")}
          className="min-h-14 rounded-xl bg-[#f4c430] px-3 text-lg font-black text-[#062048] shadow-sm active:bg-slate-200 disabled:opacity-45"
        >
          Rival
        </button>
      </div>
      <div data-acta-utilities className="mt-2 grid grid-cols-[1.25fr_0.85fr_1fr] gap-2">
        <button
          type="button"
          disabled={!playing}
          onClick={onBench}
          aria-label="Tiempo muerto"
          className="flex min-h-14 flex-col items-center justify-center rounded-xl bg-slate-100 px-1 text-sm leading-tight font-extrabold active:bg-slate-200 disabled:opacity-45"
        >
          <span>Tiempo muerto</span>
          <span className="mt-0.5 text-xs font-bold text-slate-600 tabular-nums">
            Pedidos: M {timeoutCount(sheet, "us")} · R {timeoutCount(sheet, "them")}
          </span>
        </button>
        <button
          type="button"
          disabled={!playing}
          onClick={onHistory}
          aria-label="Corregir jugadas"
          className="min-h-12 rounded-xl bg-slate-100 px-1 text-sm font-extrabold active:bg-slate-200 disabled:opacity-45"
        >
          Corregir
        </button>
        <button
          type="button"
          disabled={!playing}
          onClick={onPeriods}
          className="min-h-12 rounded-xl border-2 border-[#062048] bg-white px-1 text-sm leading-tight font-extrabold active:bg-blue-50 disabled:opacity-45"
        >
          {sheet.period === sheet.periods ? "Terminar partido" : "Terminar cuarto"}
        </button>
      </div>
    </>
  );
}

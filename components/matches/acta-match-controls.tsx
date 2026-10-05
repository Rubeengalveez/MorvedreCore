import { type LiveSheet, type Side } from "@/lib/domain/live-match";
import { timeoutStatus } from "@/lib/domain/live-match-timeouts";

export function ActaMatchControls({
  sheet,
  playing,
  onTeam,
  onBench,
  onHistory,
  onPeriods,
  isAway = false,
}: {
  sheet: LiveSheet;
  playing: boolean;
  onTeam: (team: Side) => void;
  onBench: () => void;
  onHistory: () => void;
  onPeriods: () => void;
  isAway?: boolean;
}) {
  const us = timeoutStatus(sheet, "us");
  const them = timeoutStatus(sheet, "them");
  return (
    <>
      <div
        data-acta-teams
        className={`grid grid-cols-2 gap-2 ${isAway ? "[&>button:first-child]:order-2" : ""}`}
      >
        <button
          type="button"
          disabled={!playing}
          onClick={() => onTeam("us")}
          className="min-h-14 min-w-0 rounded-xl border border-white/30 bg-[#1657a8] px-3 text-lg leading-tight font-black [overflow-wrap:anywhere] text-white shadow-sm active:bg-[#083c69] disabled:opacity-45"
        >
          Morvedre
        </button>
        <button
          type="button"
          disabled={!playing}
          onClick={() => onTeam("them")}
          className="min-h-14 min-w-0 rounded-xl bg-[#f4c430] px-3 text-lg leading-tight font-black [overflow-wrap:anywhere] text-[#062048] shadow-sm active:bg-slate-200 disabled:opacity-45"
        >
          Rival
        </button>
      </div>
      <div data-acta-utilities className="mt-2 grid grid-cols-[1.25fr_0.85fr_1fr] gap-2">
        <button
          type="button"
          disabled={!playing}
          onClick={onBench}
          aria-label={`Entrenador: tiempos muertos ${us.limit ? `Morvedre ${us.used} de ${us.limit} usados, ${us.remaining} disponibles; rival ${them.used} de ${them.limit} usados, ${them.remaining} disponibles` : "no permitidos en esta categoría"}; tarjetas`}
          className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-100 px-1 text-sm leading-tight font-extrabold text-[#062048] active:bg-slate-200 disabled:opacity-45"
        >
          <span>Entrenador</span>
          <span className="flex w-full items-baseline justify-center gap-1 text-sm leading-tight font-bold whitespace-nowrap tabular-nums">
            {us.limit ? (
              <>
                <span className="text-slate-700">M</span>
                <span
                  className={`text-base font-black ${us.remaining ? "text-pool-deep" : "text-red-800"}`}
                >
                  {us.remaining}
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="text-slate-700">R</span>
                <span
                  className={`text-base font-black ${them.remaining ? "text-pool-deep" : "text-red-800"}`}
                >
                  {them.remaining}
                </span>
              </>
            ) : (
              "Sin tiempos"
            )}
          </span>
        </button>
        <button
          type="button"
          disabled={!playing}
          onClick={onHistory}
          aria-label="Corregir jugadas"
          className="min-h-12 min-w-0 rounded-xl bg-slate-100 px-1 text-sm font-extrabold [overflow-wrap:anywhere] active:bg-slate-200 disabled:opacity-45"
        >
          Corregir
        </button>
        <button
          type="button"
          disabled={!playing}
          onClick={onPeriods}
          className="min-h-12 min-w-0 rounded-xl border-2 border-[#062048] bg-white px-1 text-sm leading-tight font-extrabold [overflow-wrap:anywhere] active:bg-blue-50 disabled:opacity-45"
        >
          {sheet.period === sheet.periods ? "Terminar partido" : "Terminar cuarto"}
        </button>
      </div>
    </>
  );
}

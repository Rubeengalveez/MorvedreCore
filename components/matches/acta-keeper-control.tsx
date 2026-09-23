import { ChevronRight } from "lucide-react";
import type { LiveSheet } from "@/lib/domain/live-match";
import { ActaPlayerName } from "./acta-player-name";

export function ActaKeeperControl({
  sheet,
  disabled,
  onChange,
}: {
  sheet: LiveSheet;
  disabled: boolean;
  onChange: () => void;
}) {
  const keeper = sheet.players.find((player) => player.cap === sheet.keeper);
  return (
    <div className="bg-white px-2 pt-1 pb-3 sm:px-3">
      <button
        data-acta-keeper-control
        type="button"
        disabled={disabled}
        onClick={onChange}
        className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-3 text-left active:bg-slate-100 disabled:opacity-60"
        aria-label={
          keeper
            ? `Portero en juego, gorro ${keeper.cap}, ${keeper.name}. Cambiar portero`
            : "Elegir portero en juego"
        }
      >
        <span className="grid h-10 min-w-8 shrink-0 place-items-center rounded-md bg-[#062048] text-xl font-black text-white">
          {keeper?.cap ?? "—"}
        </span>
        <span data-acta-keeper-summary className="min-w-0 flex-1">
          <span className="block text-sm leading-tight font-medium text-slate-700">
            Portero en juego
          </span>
          <strong className="mt-1 block text-base leading-snug font-bold text-[#062048]">
            {keeper ? <ActaPlayerName name={keeper.name} /> : "Elegir portero"}
          </strong>
        </span>
        {keeper && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#b8cada] bg-[#e8f1fc] px-2 py-1 text-xs font-black text-[#0b4d86]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#1657a8]" />
            Ahora
          </span>
        )}
        <span
          data-acta-keeper-change
          className="flex items-center gap-1 text-sm font-extrabold text-[#062048]"
        >
          Cambiar
          <ChevronRight size={19} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}

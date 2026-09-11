import { ClipboardList, ChevronRight } from "lucide-react";

export function DelegateMatchEntry({
  matchId,
  started,
  finished,
}: {
  matchId: string;
  started: boolean;
  finished: boolean;
}) {
  return (
    <section
      aria-label="Acta del delegado"
      className="border-pool-deep overflow-hidden rounded-2xl border-2 bg-white"
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <ClipboardList className="shrink-0" size={28} aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-slate-600">Para ti, delegado</p>
          <h2 className="text-xl font-extrabold">Acta del partido</h2>
        </div>
      </div>
      <p className="px-4 py-3 text-base text-slate-600">
        {finished
          ? "Consulta el acta y compártela con el equipo."
          : "Anota desde aquí los goles y las expulsiones."}
      </p>
      <a
        href={`/acta?match=${matchId}`}
        className="bg-pool-deep mx-3 mb-3 flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <span>
          <strong className="block text-lg">
            {finished
              ? "Ver acta del partido"
              : started
                ? "Continuar acta en directo"
                : "Abrir acta en directo"}
          </strong>
          <span className="mt-1 block text-sm text-blue-100">
            {finished ? "Resumen y PDF" : "Durante el partido · Jugada a jugada"}
          </span>
        </span>
        <ChevronRight className="shrink-0" aria-hidden="true" />
      </a>
      {!started && !finished && (
        <a
          href={`/matches/${matchId}/registro`}
          className="flex min-h-14 items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-base font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-blue-700"
        >
          <span>
            Solo goles y expulsiones
            <span className="block text-sm font-normal text-slate-600">
              Introduce los totales al terminar
            </span>
          </span>
          <ChevronRight className="shrink-0" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

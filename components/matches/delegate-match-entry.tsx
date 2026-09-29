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
      className="border-pool-deep/75 bg-paper-card shadow-elev-1 rounded-2xl border-2 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="bg-pool-deep text-paper flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <ClipboardList size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-pool-deep text-lg leading-tight font-extrabold">Acta del partido</h2>
        </div>
        {started && !finished ? (
          <span className="bg-paper-card border-pool-blue/40 text-pool-deep shrink-0 rounded-lg border px-2 py-1 text-xs font-extrabold">
            En curso
          </span>
        ) : null}
      </div>
      <p className="text-ink-700 mt-3 text-sm leading-snug font-medium">
        {finished ? "Consulta o comparte el acta." : "Anota las jugadas en directo."}
      </p>
      <a
        href={`/acta?match=${matchId}`}
        className="bg-pool-deep text-paper focus-visible:outline-pool-blue mt-4 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-base font-extrabold hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span>{finished ? "Ver acta" : "Abrir acta"}</span>
        <ChevronRight className="shrink-0" aria-hidden="true" />
      </a>
    </section>
  );
}

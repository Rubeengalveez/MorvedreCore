"use client";

import { LoaderCircle, Trophy } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";

export function ClubRankingsLoading() {
  return (
    <PageShell width="md" className="min-h-[60dvh] justify-center">
      <section
        role="status"
        aria-busy="true"
        className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white"
      >
        <div className="bg-pool-deep flex items-center gap-3 p-5 text-white">
          <Trophy className="text-ball-gold h-7 w-7" aria-hidden="true" />
          <h1 className="text-xl font-extrabold">Estadísticas del club</h1>
        </div>
        <div className="text-pool-deep flex items-center gap-3 p-6 font-semibold">
          <LoaderCircle
            className="text-pool-blue h-6 w-6 shrink-0 motion-safe:animate-spin"
            aria-hidden="true"
          />
          <p>Preparando las clasificaciones…</p>
        </div>
      </section>
    </PageShell>
  );
}

export function ClubRankingsError({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md" className="min-h-[60dvh] justify-center">
      <section className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white">
        <h1 className="bg-pool-deep p-5 text-xl font-extrabold text-white">
          No se han cargado los rankings
        </h1>
        <div className="text-pool-deep grid gap-4 p-5">
          <p role="alert" className="font-semibold">
            No hemos podido comprobar los datos. Vuelve a intentarlo.
          </p>
          <button
            type="button"
            onClick={reset}
            className="bg-pool-deep focus-visible:outline-pool-blue min-h-14 rounded-xl px-4 font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Volver a cargar
          </button>
        </div>
      </section>
    </PageShell>
  );
}

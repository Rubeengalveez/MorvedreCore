"use client";
import { PageShell } from "@/components/ui/page-shell";
export default function AttendanceError({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md">
      <section className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white">
        <h1 className="bg-pool-deep p-4 text-xl font-extrabold text-white">
          No se ha cargado la asistencia
        </h1>
        <div className="grid gap-3 p-4">
          <p role="alert" className="text-pool-deep font-semibold">
            No hemos podido consultar los registros. Revisa la conexión.
          </p>
          <button
            onClick={reset}
            type="button"
            className="bg-pool-deep focus-visible:outline-pool-blue min-h-14 rounded-xl px-4 font-extrabold text-white focus-visible:outline-2"
          >
            Volver a cargar
          </button>
        </div>
      </section>
    </PageShell>
  );
}

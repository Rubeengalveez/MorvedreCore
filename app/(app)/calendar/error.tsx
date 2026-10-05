"use client";
import { CalendarDays } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
export default function CalendarError({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md">
      <div className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white">
        <div className="bg-pool-deep flex items-center gap-3 p-4 text-white">
          <CalendarDays aria-hidden="true" className="h-6 w-6" />
          <h1 className="text-xl font-extrabold">No se ha cargado el calendario</h1>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p role="alert" className="text-pool-deep font-semibold">
            Revisa tu conexión y vuelve a intentarlo.
          </p>
          <button
            onClick={reset}
            type="button"
            className="bg-pool-deep focus-visible:outline-pool-blue min-h-14 rounded-xl px-4 font-extrabold text-white focus-visible:outline-2"
          >
            Volver a cargar
          </button>
        </div>
      </div>
    </PageShell>
  );
}

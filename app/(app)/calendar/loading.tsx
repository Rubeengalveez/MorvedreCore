import { CalendarDays } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
export default function CalendarLoading() {
  return (
    <PageShell width="md" className="gap-3 py-3" aria-busy="true">
      <header className="text-pool-deep flex min-h-12 items-center gap-2.5 px-1">
        <CalendarDays className="h-8 w-8" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold">Calendario</h1>
      </header>
      <div className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white">
        <p role="status" className="bg-pool-deep px-4 py-5 text-center font-extrabold text-white">
          Preparando tu calendario…
        </p>
        <div className="grid grid-cols-7 gap-1 p-2" aria-hidden="true">
          {Array.from({ length: 35 }, (_, index) => (
            <span
              key={index}
              className="min-h-14 rounded-lg border border-slate-400 bg-blue-50 motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

import { CalendarDays, Loader2 } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page";
export default function Loading() {
  return (
    <AdminPageShell>
      <div className="flex min-h-[calc(100dvh-var(--top-bar-height)-var(--bottom-nav-height)-6rem)] items-center justify-center">
        <section
          role="status"
          aria-busy="true"
          className="border-pool-deep/70 text-pool-deep w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white"
        >
          <div className="bg-pool-deep flex items-center gap-3 px-5 py-5 text-white">
            <CalendarDays className="h-7 w-7" aria-hidden="true" />
            <h1 className="text-2xl font-extrabold">Entrenamientos</h1>
          </div>
          <div className="grid justify-items-center gap-4 px-6 py-8 text-center">
            <Loader2
              className="text-pool-blue h-10 w-10 motion-safe:animate-spin"
              aria-hidden="true"
            />
            <h2 className="text-xl font-extrabold">Preparando el horario…</h2>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}

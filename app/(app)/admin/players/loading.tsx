import { Loader2, UsersRound } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page";

export default function Loading() {
  return (
    <AdminPageShell>
      <div className="flex min-h-[calc(100dvh-var(--top-bar-height)-var(--bottom-nav-height)-3rem)] items-center justify-center">
        <section
          role="status"
          aria-busy="true"
          className="border-pool-deep/65 text-pool-deep w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white"
        >
          <div className="bg-pool-deep flex items-center gap-3 px-5 py-5 text-white">
            <UsersRound aria-hidden="true" className="h-7 w-7" />
            <h1 className="text-2xl font-extrabold">Jugadores</h1>
          </div>
          <div className="grid justify-items-center gap-4 px-6 py-8 text-center">
            <Loader2
              aria-hidden="true"
              className="text-pool-blue h-10 w-10 motion-safe:animate-spin"
            />
            <h2 className="text-xl font-extrabold">Preparando la plantilla…</h2>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}

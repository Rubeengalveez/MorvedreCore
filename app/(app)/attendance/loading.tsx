import { ClipboardCheck } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
export default function AttendanceLoading() {
  return (
    <PageShell width="md" className="min-h-[55dvh] justify-center">
      <section
        role="status"
        aria-busy="true"
        className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white"
      >
        <div className="bg-pool-deep flex items-center gap-3 p-4 text-white">
          <ClipboardCheck className="h-6 w-6" aria-hidden="true" />
          <h1 className="text-xl font-extrabold">Asistencia</h1>
        </div>
        <p className="text-pool-deep p-5 font-semibold">Preparando las listas y registros…</p>
      </section>
    </PageShell>
  );
}

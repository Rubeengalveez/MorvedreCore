"use client";
import { PageShell } from "@/components/ui/page-shell";
import { RefreshCw } from "lucide-react";
import { shopPrimary } from "@/components/shop/shop-ui";
export default function HomeError({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md">
      <section
        role="alert"
        className="border-pool-deep overflow-hidden rounded-2xl border-2 bg-white"
      >
        <h1 className="bg-pool-deep p-4 text-xl font-extrabold text-white">
          No pudimos preparar Inicio
        </h1>
        <div className="space-y-4 p-4">
          <p className="text-pool-deep font-semibold">
            Comprueba tu conexión y vuelve a intentarlo.
          </p>
          <button type="button" onClick={reset} className={`${shopPrimary} w-full`}>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Volver a intentar
          </button>
        </div>
      </section>
    </PageShell>
  );
}

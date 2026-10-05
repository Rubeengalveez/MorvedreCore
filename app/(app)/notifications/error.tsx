"use client";
import { PageShell } from "@/components/ui/page-shell";
import { shopPrimary } from "@/components/shop/shop-ui";
export default function NotificationsError({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md">
      <section
        role="alert"
        className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white"
      >
        <h1 className="bg-pool-deep p-5 text-2xl font-extrabold text-white">
          No pudimos cargar tus avisos
        </h1>
        <div className="text-pool-deep space-y-4 p-5">
          <p>Comprueba tu conexión y vuelve a intentarlo.</p>
          <button type="button" onClick={reset} className={`${shopPrimary} w-full`}>
            Volver a intentar
          </button>
        </div>
      </section>
    </PageShell>
  );
}

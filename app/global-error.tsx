"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/monitoring/error-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest, area: "root-global-error" });
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-paper text-ink-900 flex min-h-dvh flex-col items-center justify-center p-6 text-center antialiased">
        <div className="border-ink-200 bg-paper-card shadow-elev-2 flex w-full max-w-md flex-col items-center rounded-lg border p-6 sm:p-8">
          <div className="bg-goggle-red/10 text-goggle-red mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
            Error crítico del sistema
          </div>

          <h1 className="text-pool-deep text-2xl font-black tracking-tight">
            Morvedre Core
          </h1>

          <p className="text-ink-600 mt-3 text-sm leading-relaxed">
            Se ha producido un error crítico al cargar la aplicación. Por favor, pulsa el botón
            inferior para reiniciar la sesión.
          </p>

          <div className="mt-6 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="bg-pool-deep text-paper h-12 w-full rounded-md px-4 text-base font-bold transition-opacity hover:opacity-90 active:opacity-100"
            >
              Reiniciar aplicación
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="border-ink-300 bg-paper text-pool-deep h-12 w-full rounded-md border px-4 text-base font-semibold transition-colors hover:bg-slate-50"
            >
              Ir a la portada
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

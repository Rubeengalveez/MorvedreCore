"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { RefreshCw, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/monitoring/error-logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest, area: "app-error-boundary" });
  }, [error]);

  return (
    <main
      id="main-content"
      className="bg-paper flex min-h-dvh flex-col items-center justify-center px-4 py-8 text-center sm:px-6"
    >
      <div className="border-ink-200 bg-paper-card shadow-elev-2 flex w-full max-w-md flex-col items-center rounded-lg border p-6 sm:p-8">
        <div className="relative mb-4 h-16 w-16">
          <Image
            src="/brand/logo.webp"
            alt="Club Waterpolo Morvedre"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>

        <div className="bg-goggle-red/10 text-goggle-red mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Error en la aplicación
        </div>

        <h1 className="font-display text-pool-deep text-2xl font-black tracking-tight sm:text-3xl">
          Ha ocurrido un imprevisto
        </h1>

        <p className="text-ink-600 mt-3 text-sm leading-relaxed sm:text-base">
          Algo no ha salido como esperábamos. Hemos registrado el incidente para solucionarlo.
          Puedes reintentar la acción o volver al inicio.
        </p>

        {error.digest && (
          <p className="border-ink-200 bg-paper-sunk text-ink-500 font-mono mt-4 rounded border px-2.5 py-1 text-xs">
            Código: {error.digest}
          </p>
        )}

        <div className="mt-6 flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => reset()}
            className="w-full font-bold"
          >
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
            Reintentar
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            asChild
            className="w-full font-semibold"
          >
            <Link href="/">
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-ink-400 mt-6 text-xs">
        Club Waterpolo Morvedre · Puerto de Sagunto
      </p>
    </main>
  );
}

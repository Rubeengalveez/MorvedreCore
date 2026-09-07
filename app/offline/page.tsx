"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { RefreshCw, ArrowLeft, WifiOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [lastActa,setLastActa]=useState<string|null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? false : navigator.onLine,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(()=>{const id=localStorage.getItem("morvedre-last-acta");if(id&&/^[0-9a-f-]{36}$/i.test(id))setLastActa(id);});
    function handleOnline() {
      setIsOnline(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function handleRetry() {
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <main
      id="main-content"
      className="bg-paper flex min-h-dvh flex-col items-center justify-center px-4 py-8 text-center sm:px-6"
    >
      <div className="border-ink-200 bg-paper-card shadow-elev-2 flex w-full max-w-md flex-col items-center rounded-lg border p-6 sm:p-8">
        <div className="relative mb-5 h-16 w-16">
          <Image
            src="/brand/logo.webp"
            alt="Club Waterpolo Morvedre"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>

        <div
          role="status"
          aria-live="polite"
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
        >
          {isOnline ? (
            <span className="bg-success/15 text-success inline-flex items-center gap-1.5 rounded-full px-3 py-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Conexión recuperada. Recargando...
            </span>
          ) : (
            <span className="bg-goggle-red/10 text-goggle-red inline-flex items-center gap-1.5 rounded-full px-3 py-1">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sin conexión a internet
            </span>
          )}
        </div>

        <h1 className="font-display text-pool-deep text-2xl font-black tracking-tight sm:text-3xl">
          Estás sin conexión
        </h1>

        <p className="text-ink-600 mt-3 text-sm leading-relaxed sm:text-base">
          Puedes continuar un acta que hayas preparado en este móvil. Sus jugadas se guardan aquí
          y se envían al recuperar la conexión. Las demás secciones necesitan internet.
        </p>

        <div className="mt-6 flex w-full flex-col gap-3">
          {lastActa&&<a href={`/acta?match=${lastActa}`} className="bg-pool-deep text-paper flex min-h-12 items-center justify-center rounded-xl p-3 font-bold">Retomar acta del partido</a>}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleRetry}
            disabled={isPending}
            className="w-full font-bold"
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${isPending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isPending ? "Comprobando..." : "Reintentar conexión"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => window.history.back()}
            className="w-full font-semibold"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Volver a la pantalla anterior
          </Button>

          <Link
            href="/"
            className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue focus-visible:ring-offset-paper mt-2 inline-block text-xs font-semibold underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Ir a la portada del club
          </Link>
        </div>
      </div>

      <p className="text-ink-400 mt-6 text-xs">
        Club Waterpolo Morvedre · Puerto de Sagunto
      </p>
    </main>
  );
}

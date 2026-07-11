"use client";

import { useEffect } from "react";

import { StatusPage } from "@/components/ui/status-page";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      eyebrow="No hemos podido cargar esta pantalla"
      title="Algo se ha quedado fuera de juego"
      description="Vuelve a intentarlo. Si el problema continúa, regresa a Inicio y abre la sección de nuevo."
      retry={reset}
    />
  );
}

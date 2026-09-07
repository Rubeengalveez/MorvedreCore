"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadClosureButton({ closureId }: { closureId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloadUrl = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      request.current?.abort();
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    },
    [],
  );

  async function download() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    timeoutRef.current = timeout;
    setPending(true);
    setError(null);
    let failureMessage = "No pudimos descargar el Excel. Inténtalo de nuevo.";
    try {
      const response = await fetch(
        `/api/treasury/closures/${encodeURIComponent(closureId)}/export`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (typeof body?.error === "string") failureMessage = body.error;
        throw new Error("download rejected");
      }
      if (!response.headers.get("content-type")?.includes("spreadsheetml.sheet")) {
        failureMessage = "No hemos recibido el Excel. Comprueba tu sesión e inténtalo de nuevo.";
        throw new Error("unexpected response");
      }
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl.current;
      const filename = response.headers
        .get("content-disposition")
        ?.match(/filename="(tesoreria_[a-z0-9_\-]+\.xlsx)"/)?.[1];
      link.download = filename ?? "tesoreria.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError(
        controller.signal.aborted
          ? "La descarga ha tardado demasiado. Inténtalo de nuevo."
          : failureMessage,
      );
    } finally {
      window.clearTimeout(timeout);
      timeoutRef.current = null;
      request.current = null;
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="primary"
        className="w-full"
        disabled={pending}
        aria-busy={pending}
        onClick={download}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {pending ? "Preparando Excel…" : "Descargar Excel"}
      </Button>
      {error ? (
        <p role="alert" className="text-goggle-red mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

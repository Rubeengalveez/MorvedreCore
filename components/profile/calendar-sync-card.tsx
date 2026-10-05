"use client";
import { useEffect, useRef, useState } from "react";
import { Calendar, Check, Copy } from "lucide-react";
import { shopPrimary } from "@/components/shop/shop-ui";
export function CalendarSyncCard({ token, baseUrl }: { token: string; baseUrl: string }) {
  const [origin, setOrigin] = useState(baseUrl);
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    queueMicrotask(() => setOrigin(window.location.origin));
  }, []);
  const feedUrl =
    token && origin ? `${origin}/api/calendar/feed.ics?token=${encodeURIComponent(token)}` : "";
  async function copy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setStatus("Enlace copiado");
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus("Enlace seleccionado. Mantén pulsado y elige Copiar.");
    }
  }
  return (
    <section className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white">
      <h2 className="bg-pool-deep flex items-center gap-2 px-4 py-3 text-lg font-extrabold text-white">
        <Calendar aria-hidden="true" className="h-5 w-5" />
        Mi calendario
      </h2>
      <div className="text-pool-deep space-y-3 p-4">
        <p className="text-base font-medium">
          Añade tus partidos y entrenamientos al calendario del móvil.
        </p>
        <input
          ref={input}
          readOnly
          value={feedUrl}
          aria-label="Enlace personal del calendario"
          onClick={(event) => event.currentTarget.select()}
          className="border-pool-deep/65 min-h-12 w-full rounded-xl border-2 bg-blue-50 px-3 text-base"
        />
        <button
          type="button"
          disabled={!feedUrl}
          onClick={() => void copy()}
          className={`${shopPrimary} w-full`}
        >
          <Copy aria-hidden="true" className="h-5 w-5" />
          Copiar enlace
        </button>
        {status && (
          <p role="status" className="flex items-start gap-2 text-sm font-bold">
            <Check aria-hidden="true" className="h-5 w-5 shrink-0" />
            {status}
          </p>
        )}
        <p className="text-sm font-semibold">Este enlace es personal. No lo compartas.</p>
      </div>
    </section>
  );
}

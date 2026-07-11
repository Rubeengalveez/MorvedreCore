"use client";

import { useState } from "react";
import { Calendar, Copy, Check } from "lucide-react";

export function CalendarSyncCard({ token, baseUrl }: { token: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false);

  const feedUrl = `${baseUrl}/api/calendar/feed.ics?token=${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <section className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <div className="bg-pool-foam flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Calendar className="text-pool-teal h-4.5 w-4.5" />
        </div>
        <h2 className="font-display text-pool-deep text-sm font-extrabold">
          Sincronizar calendario
        </h2>
      </div>
      <p className="text-ink-600 text-xs">
        Copia este enlace para añadir tus entrenamientos y partidos a Google Calendar o Apple
        Calendar de manera automática.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={feedUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="border-ink-300 bg-paper-sunk text-ink-700 min-w-0 flex-1 rounded-md border px-2.5 py-2 font-mono text-xs select-all focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="bg-pool-deep text-paper hover:bg-ink-900 focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 touch-manipulation items-center justify-center gap-1 rounded-xl px-3.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {copied ? (
            <>
              <Check className="text-success h-3.5 w-3.5" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}

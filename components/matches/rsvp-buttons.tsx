"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { setMyCallupStatus } from "@/server/actions/admin";

export type RsvpStatus = "called" | "confirmed" | "declined" | "withdrawn" | "no_show";

export interface RsvpButtonsProps {
  matchId: string;
  currentStatus: RsvpStatus;
}

export function RsvpButtons({ matchId, currentStatus }: RsvpButtonsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send(status: "confirmed" | "declined" | "withdrawn") {
    setError(null);
    startTransition(async () => {
      try {
        await setMyCallupStatus({ match_id: matchId, status });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar tu respuesta.");
      }
    });
  }

  const isConfirmed = currentStatus === "confirmed" || currentStatus === "called";
  const isDeclined =
    currentStatus === "declined" || currentStatus === "withdrawn" || currentStatus === "no_show";

  return (
    <div className="flex w-full flex-col gap-2.5 select-none">
      <span className="text-ink-500 text-[10px] font-black tracking-widest uppercase">
        ¿Confirmas tu asistencia al partido?
      </span>

      <div className="xs:flex-row flex flex-col gap-2.5">
        {/* Green Button: Confirm */}
        <button
          type="button"
          disabled={pending}
          onClick={() => send("confirmed")}
          className={cn(
            "flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border text-xs font-extrabold transition-all active:scale-[0.97]",
            isConfirmed
              ? "text-paper border-emerald-600 bg-emerald-600 shadow-sm"
              : "bg-paper border-emerald-500/25 text-emerald-700 hover:bg-emerald-50/50",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span>{isConfirmed ? "Asistiré" : "Confirmar asistencia"}</span>
        </button>

        {/* Red Button: Decline */}
        <button
          type="button"
          disabled={pending}
          onClick={() => send("declined")}
          className={cn(
            "flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border text-xs font-extrabold transition-all active:scale-[0.97]",
            isDeclined
              ? "text-paper border-red-600 bg-red-600 shadow-sm"
              : "bg-paper border-red-500/25 text-red-600 hover:bg-red-50/50",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          <span>{isDeclined ? "No puedo ir" : "Denegar asistencia"}</span>
        </button>
      </div>

      {error ? <p className="text-danger mt-1 text-xs font-semibold">{error}</p> : null}
    </div>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { setMyCallupStatus } from "@/server/actions/admin";

export type RsvpStatus = "called" | "confirmed" | "declined" | "withdrawn" | "no_show";

export interface RsvpButtonsProps {
  matchId: string;
  currentStatus: RsvpStatus;
  playerId?: string;
  playerName?: string;
}

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function RsvpButtons({ matchId, currentStatus, playerId, playerName }: RsvpButtonsProps) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(status: "confirmed" | "declined" | "withdrawn") {
    setError(null);
    setPending(true);
    try {
      await setMyCallupStatus({ match_id: matchId, status, player_id: playerId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar tu respuesta.");
    } finally {
      setPending(false);
    }
  }

  const isConfirmed = currentStatus === "confirmed";
  const isDeclined =
    currentStatus === "declined" || currentStatus === "withdrawn" || currentStatus === "no_show";

  return (
    <div className="flex w-full flex-col gap-2.5 select-none">
      <span className="text-eyebrow text-ink-500">
        {playerName
          ? `¿Confirmas la asistencia de ${playerName}?`
          : "¿Confirmas tu asistencia al partido?"}
      </span>

      <div className="xs:flex-row flex flex-col gap-2.5">
        <Button
          type="button"
          size="xl"
          variant={isConfirmed ? "success" : "gold"}
          disabled={pending || !hydrated}
          onClick={() => send("confirmed")}
          className={cn("flex-1", isConfirmed && "border-success border")}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span>{isConfirmed ? "Asistiré" : "Confirmar asistencia"}</span>
        </Button>

        <Button
          type="button"
          size="xl"
          variant={isDeclined ? "danger" : "secondary"}
          disabled={pending || !hydrated}
          onClick={() => send("declined")}
          className="flex-1"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          <span>{isDeclined ? "No puedo ir" : "Denegar asistencia"}</span>
        </Button>
      </div>

      {error ? <p className="text-danger mt-1 text-xs font-semibold">{error}</p> : null}
    </div>
  );
}

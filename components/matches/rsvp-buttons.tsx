"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setMyCallupStatus } from "@/server/actions/admin";
import { cn } from "@/lib/utils/cn";

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
        setError(
          err instanceof Error
            ? err.message
            : "No pudimos guardar tu respuesta.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          variant="primary"
          disabled={pending || currentStatus === "confirmed"}
          onClick={() => send("confirmed")}
          className="w-full text-paper sm:flex-1"
          style={{ backgroundColor: "var(--success)" }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Confirmo
        </Button>
        <Button
          size="lg"
          variant="danger"
          disabled={pending || currentStatus === "declined"}
          onClick={() => send("declined")}
          className="w-full sm:flex-1"
        >
          No puedo
        </Button>
      </div>
      {currentStatus !== "called" && currentStatus !== "withdrawn" ? (
        <Button
          size="md"
          variant="secondary"
          disabled={pending}
          onClick={() => send("withdrawn")}
          className="w-full"
        >
          Cambiar de opinión
        </Button>
      ) : null}
      {error ? (
        <p className={cn("text-sm font-medium text-danger")}>{error}</p>
      ) : null}
    </div>
  );
}

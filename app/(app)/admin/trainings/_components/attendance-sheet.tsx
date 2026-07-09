"use client";

import { MdCheck, MdAutorenew, MdClose } from "react-icons/md";
import { useMemo, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { formatShortDate, formatTime } from "@/lib/utils/format";
import { markAllPresent, markAttendance } from "@/server/actions/admin";

export interface AttendancePlayer {
  id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  present: boolean;
  reason: string | null;
}

export interface AttendanceSheetProps {
  sessionId: string;
  sessionLabel: string;
  players: AttendancePlayer[];
  onClose: () => void;
}

type RowState = {
  present: boolean;
  reason: string;
};

export function AttendanceSheet({
  sessionId,
  sessionLabel,
  players,
  onClose,
}: AttendanceSheetProps) {
  const initial = useMemo<Record<string, RowState>>(() => {
    const map: Record<string, RowState> = {};
    for (const p of players) {
      map[p.id] = { present: p.present, reason: p.reason ?? "" };
    }
    return map;
  }, [players]);

  const [rows, setRows] = useState<Record<string, RowState>>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [markingAll, startMarkingAll] = useTransition();

  function toggle(playerId: string, present: boolean) {
    setRows((prev) => ({
      ...prev,
      [playerId]: {
        present,
        reason: present ? "" : (prev[playerId]?.reason ?? ""),
      },
    }));
  }

  function setReason(playerId: string, reason: string) {
    setRows((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId]!, reason },
    }));
  }

  function markAll() {
    const next: Record<string, RowState> = {};
    for (const p of players) {
      next[p.id] = { present: true, reason: "" };
    }
    setRows(next);
  }

  function handleMarkAllServer() {
    setError(null);
    setSuccess(false);
    startMarkingAll(async () => {
      try {
        await markAllPresent(sessionId);
        setSuccess(true);
        markAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos marcar.");
      }
    });
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    const payload = players.map((p) => {
      const row = rows[p.id] ?? { present: p.present, reason: "" };
      return {
        player_id: p.id,
        present: row.present,
        reason: row.present ? null : row.reason.trim() || null,
      };
    });
    startTransition(async () => {
      try {
        await markAttendance({ session_id: sessionId, rows: payload });
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar.");
      }
    });
  }

  const presentCount = players.filter((p) => (rows[p.id]?.present ?? p.present) === true).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-pool-deep text-xl font-bold">Pasar lista</h2>
        <p className="text-ink-600 text-sm">
          {sessionLabel} · {presentCount} de {players.length} presentes
        </p>
      </header>

      {error ? (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Asistencia guardada">
          La lista se ha guardado correctamente.
        </Alert>
      ) : null}

      <Button
        type="button"
        size="lg"
        variant="secondary"
        onClick={handleMarkAllServer}
        disabled={markingAll || pending}
        className="w-full"
      >
        {markingAll ? (
          <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <MdCheck className="h-5 w-5" aria-hidden="true" />
        )}
        Marcar todos disponibles
      </Button>

      <ul className="flex flex-col gap-2">
        {players.map((p) => {
          const row = rows[p.id] ?? { present: p.present, reason: "" };
          const isPresent = row.present;
          return (
            <li
              key={p.id}
              className={cn(
                "bg-paper flex flex-col gap-2 rounded-md border p-3",
                isPresent ? "border-success/30" : "border-danger/30",
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.full_name} src={p.photo_url} size={40} />
                <div className="flex flex-1 flex-col">
                  <span className="font-display text-pool-deep text-base font-bold">
                    {p.full_name}
                  </span>
                  {p.cap_number != null ? (
                    <span className="text-ink-600 font-mono text-xs">Dorsal {p.cap_number}</span>
                  ) : null}
                </div>
                <div
                  role="group"
                  aria-label={`Asistencia de ${p.full_name}`}
                  className="flex shrink-0 gap-1"
                >
                  <button
                    type="button"
                    onClick={() => toggle(p.id, true)}
                    aria-pressed={isPresent}
                    aria-label="Presente"
                    className={cn(
                      "focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex h-12 min-h-12 w-12 items-center justify-center rounded border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      isPresent
                        ? "border-success bg-success text-paper"
                        : "border-ink-300 bg-paper text-ink-600 hover:border-success",
                    )}
                  >
                    <MdCheck className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(p.id, false)}
                    aria-pressed={!isPresent}
                    aria-label="Ausente"
                    className={cn(
                      "focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex h-12 min-h-12 w-12 items-center justify-center rounded border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      !isPresent
                        ? "border-danger bg-danger text-paper"
                        : "border-ink-300 bg-paper text-ink-600 hover:border-danger",
                    )}
                  >
                    <MdClose className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {!isPresent ? (
                <Input
                  type="text"
                  placeholder="Motivo (enfermedad, viaje, ...)"
                  value={row.reason}
                  onChange={(e) => setReason(p.id, e.target.value)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="button" size="lg" onClick={handleSave} disabled={pending || markingAll}>
          {pending ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Guardando..." : "Guardar lista"}
        </Button>
        <Button type="button" size="md" variant="secondary" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function getSessionLabel(scheduledAt: string, location: string | null): string {
  const date = formatShortDate(scheduledAt);
  const time = formatTime(scheduledAt);
  return location ? `${date} · ${time} · ${location}` : `${date} · ${time}`;
}

"use client";

import { MdNorthEast, MdAutorenew, MdWarning } from "react-icons/md";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { cn } from "@/lib/utils/cn";
import { createCallup, suggestCallupForMatch, type CallupSuggestion } from "@/server/actions/admin";

export interface SuggestCallupSheetProps {
  matchId: string;
}

export function SuggestCallupSheet({ matchId }: SuggestCallupSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CallupSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [capOverrides, setCapOverrides] = useState<Record<string, string>>({});
  const [committing, startCommit] = useTransition();
  const [commitError, setCommitError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  function closeAndRefresh() {
    const close = document.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]');
    close?.click();
    router.refresh();
  }

  useEffect(() => {
    let cancelled = false;
    suggestCallupForMatch(matchId)
      .then((data) => {
        if (cancelled) return;
        setSuggestions(data);
        const pre = new Set<string>();
        const caps: Record<string, string> = {};
        for (const s of data) {
          if (s.has_conflict || s.is_substitute) continue;
          if (s.cap_number != null) caps[s.player_id] = String(s.cap_number);
          pre.add(s.player_id);
        }
        setSelected(pre);
        setCapOverrides(caps);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No pudimos sugerir.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setCap(id: string, value: string) {
    setCapOverrides((prev) => ({ ...prev, [id]: value }));
  }

  function commit() {
    setCommitError(null);
    const targets = suggestions.filter((s) => selected.has(s.player_id));
    if (targets.length === 0) {
      setCommitError("Selecciona al menos un jugador.");
      return;
    }
    startCommit(async () => {
      let created = 0;
      for (const s of targets) {
        const capRaw = capOverrides[s.player_id];
        const cap =
          capRaw && capRaw.trim() !== "" && Number.isFinite(Number(capRaw)) ? Number(capRaw) : null;
        try {
          await createCallup({
            match_id: matchId,
            player_id: s.player_id,
            cap_number: cap,
            source_team_id: s.source_team_id,
          });
          created += 1;
        } catch (err) {
          setCommitError(
            err instanceof Error
              ? `Error con ${s.full_name}: ${err.message}`
              : "No pudimos crear las convocatorias.",
          );
          return;
        }
      }
      setDoneCount(created);
      closeAndRefresh();
    });
  }

  if (loading) {
    return (
      <div className="text-ink-600 flex items-center gap-3 text-sm">
        <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
        Analizando plantilla y disponibilidad...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" title="Error">
        {error}
      </Alert>
    );
  }

  if (doneCount != null) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="success" title="Convocatoria creada">
          Hemos añadido {doneCount} jugadores a la convocatoria.
        </Alert>
        <Button onClick={closeAndRefresh} size="lg" variant="secondary">
          Cerrar
        </Button>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="info" title="Sin sugerencias">
          No hay jugadores disponibles para este partido.
        </Alert>
        <Button onClick={closeAndRefresh} size="md" variant="secondary">
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-pool-blue/20 bg-pool-foam/60 rounded-xl border p-3">
        <p className="text-pool-deep text-sm font-extrabold">Cómo se ha preparado la propuesta</p>
        <p className="text-ink-600 mt-1 text-sm leading-relaxed">
          Primero mantiene la convocatoria anterior. Después valora goles, edad, asistencia y, como
          último desempate, menos expulsiones.
        </p>
      </div>
      {commitError ? (
        <Alert variant="danger" title="Error">
          {commitError}
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => {
          const isSelected = selected.has(s.player_id);
          return (
            <li
              key={s.player_id}
              className={cn(
                "bg-paper flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                isSelected
                  ? s.is_substitute
                    ? "border-ink-300"
                    : "border-pool-blue"
                  : "border-ink-300 opacity-70",
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(s.player_id)}
                  aria-label={`Convocar a ${s.full_name}`}
                  className="accent-pool-blue h-6 w-6 shrink-0"
                />
                <Avatar name={s.full_name} size={40} />
                <div className="flex flex-col">
                  <span className="font-display text-pool-deep text-base font-bold">
                    {s.full_name}
                  </span>
                  <div className="text-ink-600 mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="border-ink-300 inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-semibold">
                      {CATEGORY_LABELS[s.category_code as CategoryCode] ?? s.category_code}
                    </span>
                    {s.is_ascending ? (
                      <span className="bg-pool-foam text-pool-deep inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold">
                        <MdNorthEast className="h-3.5 w-3.5" aria-hidden="true" />
                        Asciende
                      </span>
                    ) : null}
                    {s.is_substitute ? (
                      <span className="bg-ink-300/40 text-ink-600 inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold">
                        Suplente
                      </span>
                    ) : null}
                    {s.has_conflict ? (
                      <span className="bg-danger/15 text-danger inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold">
                        <MdWarning className="h-3.5 w-3.5" aria-hidden="true" />
                        No disponible
                      </span>
                    ) : null}
                  </div>
                  {s.reason ? (
                    <span className="text-ink-500 mt-1 text-xs leading-relaxed">{s.reason}</span>
                  ) : null}
                </div>
              </div>
              <div className="border-ink-200 flex items-center justify-between gap-3 border-t pt-2 sm:border-t-0 sm:pt-0">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor={`dorsal-${s.player_id}`}
                    className="text-ink-600 text-xs font-bold whitespace-nowrap uppercase"
                  >
                    Dorsal
                  </label>
                  <Input
                    id={`dorsal-${s.player_id}`}
                    type="number"
                    min={0}
                    max={99}
                    placeholder="7"
                    value={capOverrides[s.player_id] ?? ""}
                    onChange={(e) => setCap(s.player_id, e.target.value)}
                    disabled={!isSelected}
                    className="h-10 w-16 px-1 py-1 text-center font-mono text-sm"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" onClick={commit} disabled={committing}>
          {committing ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {committing ? "Guardando..." : "Confirmar selección"}
        </Button>
        <Button
          type="button"
          size="md"
          variant="secondary"
          onClick={closeAndRefresh}
          disabled={committing}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

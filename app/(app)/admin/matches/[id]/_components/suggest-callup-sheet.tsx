"use client";

import { ArrowUpRight, Loader2, ShieldAlert } from "lucide-react";
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

export function SuggestCallupSheet({
  matchId,
}: SuggestCallupSheetProps) {
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
    const close = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Cerrar"]',
    );
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
          if (s.has_conflict) continue;
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
          capRaw && capRaw.trim() !== "" && Number.isFinite(Number(capRaw))
            ? Number(capRaw)
            : null;
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
      <div className="flex items-center gap-3 text-sm text-ink-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
      <p className="text-sm text-ink-600">
        Hemos propuesto {suggestions.length} jugadores. Selecciona quién
        convocar y ajusta los dorsales si lo necesitas.
      </p>
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
                "flex items-center gap-3 rounded-md border bg-paper p-3",
                isSelected
                  ? s.is_substitute
                    ? "border-ink-300"
                    : "border-brand-blue"
                  : "border-ink-300 opacity-70",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(s.player_id)}
                aria-label={`Convocar a ${s.full_name}`}
                className="h-5 w-5 accent-brand-blue"
              />
              <Avatar name={s.full_name} size={40} />
              <div className="flex flex-1 flex-col">
                <span className="font-display text-base font-bold text-brand-deep">
                  {s.full_name}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-600">
                  <span className="inline-flex h-5 items-center rounded-full border border-ink-300 px-1.5 text-[10px] font-semibold">
                    {CATEGORY_LABELS[s.category_code as CategoryCode] ??
                      s.category_code}
                  </span>
                  {s.is_ascending ? (
                    <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-brand-foam px-1.5 text-[10px] font-semibold text-brand-deep">
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      Asciende
                    </span>
                  ) : null}
                  {s.is_substitute ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-ink-300/40 px-1.5 text-[10px] font-semibold text-ink-600">
                      Suplente
                    </span>
                  ) : null}
                  {s.has_conflict ? (
                    <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-danger/15 px-1.5 text-[10px] font-semibold text-danger">
                      <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                      No disponible
                    </span>
                  ) : null}
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={99}
                placeholder="Dorsal"
                value={capOverrides[s.player_id] ?? ""}
                onChange={(e) => setCap(s.player_id, e.target.value)}
                disabled={!isSelected}
                className="w-20"
              />
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          onClick={commit}
          disabled={committing}
        >
          {committing ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : null}
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

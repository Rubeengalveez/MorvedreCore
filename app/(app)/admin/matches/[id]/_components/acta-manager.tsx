"use client";

import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  recordMatchStat,
  setMatchStatus,
  validateMatchStats,
  type CallupRow,
  type MatchRow,
  type MatchStatRow,
} from "@/server/actions/admin";

export interface ActaEntry {
  callup: CallupRow;
  player: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
  stat: MatchStatRow | null;
}

export interface ActaManagerProps {
  match: Pick<MatchRow, "id" | "status" | "final_score_us" | "final_score_them">;
  entries: ActaEntry[];
}

export function ActaManager({ match, entries }: ActaManagerProps) {
  const [us, setUs] = useState<string>(
    match.final_score_us != null ? String(match.final_score_us) : "",
  );
  const [them, setThem] = useState<string>(
    match.final_score_them != null ? String(match.final_score_them) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPlayed = match.status === "played";

  function setScore() {
    if (us === "" || them === "") return;
    const usN = Number(us);
    const themN = Number(them);
    if (!Number.isFinite(usN) || !Number.isFinite(themN)) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await setMatchStatus(match.id, "played", usN, themN);
        setSuccess("Resultado guardado.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar.");
      }
    });
  }

  function markPlayed() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const usN = us === "" ? null : Number(us);
        const themN = them === "" ? null : Number(them);
        await setMatchStatus(
          match.id,
          "played",
          usN != null && Number.isFinite(usN) ? usN : null,
          themN != null && Number.isFinite(themN) ? themN : null,
        );
        setSuccess("Partido marcado como jugado.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos actualizar.");
      }
    });
  }

  function validate() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await validateMatchStats(match.id);
        setSuccess("Acta validada. Ya no se puede modificar.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos validar.");
      }
    });
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
        <p className="text-base font-semibold text-brand-deep">
          No hay jugadores convocados.
        </p>
        <p className="mt-1 text-sm text-ink-600">
          Crea primero la convocatoria en la pestaña anterior.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Listo">
          {success}
        </Alert>
      ) : null}

      <ul className="flex flex-col gap-2">
        {entries.map((e) => (
          <StatRow key={e.callup.player_id} entry={e} disabled={isPlayed} />
        ))}
      </ul>

      <div className="rounded-md border border-ink-300 bg-paper p-4">
        <h3 className="font-display text-lg font-bold text-brand-deep">
          Resultado final
        </h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="score-us"
              className="text-xs font-semibold uppercase tracking-wider text-ink-600"
            >
              Nosotros
            </label>
            <Input
              id="score-us"
              type="number"
              min={0}
              max={99}
              value={us}
              onChange={(e) => setUs(e.target.value)}
              onBlur={setScore}
              className="mt-1 font-mono text-lg"
            />
          </div>
          <span className="self-center font-display text-2xl font-extrabold text-ink-600">
            –
          </span>
          <div className="flex-1">
            <label
              htmlFor="score-them"
              className="text-xs font-semibold uppercase tracking-wider text-ink-600"
            >
              Rival
            </label>
            <Input
              id="score-them"
              type="number"
              min={0}
              max={99}
              value={them}
              onChange={(e) => setThem(e.target.value)}
              onBlur={setScore}
              className="mt-1 font-mono text-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={validate}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          Validar acta
        </Button>
        {!isPlayed ? (
          <Button
            type="button"
            size="md"
            onClick={markPlayed}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Marcar como jugado
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StatRow({
  entry,
  disabled,
}: {
  entry: ActaEntry;
  disabled: boolean;
}) {
  const [goals, setGoals] = useState<string>(
    entry.stat ? String(entry.stat.goals) : "0",
  );
  const [exclusions, setExclusions] = useState<string>(
    entry.stat ? String(entry.stat.exclusions) : "0",
  );
  const [mvp, setMvp] = useState<boolean>(entry.stat?.mvp ?? false);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    if (!entry.stat) {
      return goals !== "0" || exclusions !== "0" || mvp;
    }
    return (
      goals !== String(entry.stat.goals) ||
      exclusions !== String(entry.stat.exclusions) ||
      mvp !== entry.stat.mvp
    );
  }, [entry.stat, goals, exclusions, mvp]);

  function commit() {
    if (!dirty) return;
    const goalsN = Math.max(0, Math.min(20, Number(goals) || 0));
    const exclusionsN = Math.max(0, Math.min(20, Number(exclusions) || 0));
    startTransition(async () => {
      await recordMatchStat({
        match_id: entry.callup.match_id,
        player_id: entry.callup.player_id,
        goals: goalsN,
        exclusions: exclusionsN,
        mvp,
      });
    });
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-md border bg-paper p-3",
        mvp ? "border-brand-ball" : "border-ink-300",
      )}
    >
      <Avatar
        name={entry.player.full_name}
        src={entry.player.photo_url}
        size={40}
      />
      <div className="flex flex-1 flex-col">
        <span className="font-display text-base font-bold text-brand-deep">
          {entry.player.full_name}
        </span>
        {entry.callup.cap_number != null ? (
          <span className="font-mono text-xs text-ink-600">
            Dorsal {entry.callup.cap_number}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <label
            htmlFor={`goals-${entry.callup.player_id}`}
            className="text-[10px] font-semibold uppercase text-ink-600"
          >
            Goles
          </label>
          <Input
            id={`goals-${entry.callup.player_id}`}
            type="number"
            min={0}
            max={20}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            onBlur={commit}
            disabled={disabled}
            className="h-10 w-16 text-center font-mono"
          />
        </div>
        <div className="flex flex-col items-center">
          <label
            htmlFor={`excl-${entry.callup.player_id}`}
            className="text-[10px] font-semibold uppercase text-ink-600"
          >
            Excl.
          </label>
          <Input
            id={`excl-${entry.callup.player_id}`}
            type="number"
            min={0}
            max={20}
            value={exclusions}
            onChange={(e) => setExclusions(e.target.value)}
            onBlur={commit}
            disabled={disabled}
            className="h-10 w-16 text-center font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setMvp(!mvp);
            startTransition(async () => {
              await recordMatchStat({
                match_id: entry.callup.match_id,
                player_id: entry.callup.player_id,
                mvp: !mvp,
              });
            });
          }}
          disabled={disabled}
          aria-pressed={mvp}
          aria-label="MVP"
          className={cn(
            "inline-flex h-12 w-12 min-h-12 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
            mvp
              ? "border-brand-ball bg-brand-ball/20 text-brand-deep"
              : "border-ink-300 bg-paper text-ink-600 hover:border-brand-ball",
          )}
        >
          <Star className="h-5 w-5" aria-hidden="true" />
        </button>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-600" aria-hidden="true" />
        ) : null}
      </div>
    </li>
  );
}

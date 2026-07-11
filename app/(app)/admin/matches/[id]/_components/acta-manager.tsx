"use client";

import { MdCheckCircle, MdAutorenew, MdStar, MdStarBorder } from "react-icons/md";
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
      <div className="border-ink-300 bg-paper rounded-md border border-dashed p-6 text-center">
        <p className="text-pool-deep text-base font-semibold">No hay jugadores convocados.</p>
        <p className="text-ink-600 mt-1 text-sm">
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

      <div className="border-ink-300 bg-paper rounded-md border p-4">
        <h3 className="font-display text-pool-deep text-lg font-bold">Resultado final</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="score-us"
              className="text-ink-600 text-xs font-semibold tracking-wider uppercase"
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
          <span className="font-display text-ink-600 self-center text-2xl font-extrabold">–</span>
          <div className="flex-1">
            <label
              htmlFor="score-them"
              className="text-ink-600 text-xs font-semibold tracking-wider uppercase"
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
        <Button type="button" variant="secondary" size="md" onClick={validate} disabled={pending}>
          {pending ? (
            <MdAutorenew className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MdCheckCircle className="h-4 w-4" aria-hidden="true" />
          )}
          Validar acta
        </Button>
        {!isPlayed ? (
          <Button type="button" size="md" onClick={markPlayed} disabled={pending}>
            {pending ? <MdAutorenew className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Marcar como jugado
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StatRow({ entry, disabled }: { entry: ActaEntry; disabled: boolean }) {
  const [goals, setGoals] = useState<string>(entry.stat ? String(entry.stat.goals) : "0");
  const [exclusions, setExclusions] = useState<string>(
    entry.stat ? String(entry.stat.exclusions) : "0",
  );
  const [pending, startTransition] = useTransition();

  const isMvp = entry.stat?.mvp ?? false;

  const dirty = useMemo(() => {
    if (!entry.stat) {
      return goals !== "0" || exclusions !== "0";
    }
    return goals !== String(entry.stat.goals) || exclusions !== String(entry.stat.exclusions);
  }, [entry.stat, goals, exclusions]);

  function commit() {
    if (!dirty) return;
    const goalsN = Math.max(0, Math.min(99, Number(goals) || 0));
    const exclusionsN = Math.max(0, Math.min(3, Number(exclusions) || 0));
    startTransition(async () => {
      await recordMatchStat({
        match_id: entry.callup.match_id,
        player_id: entry.callup.player_id,
        goals: goalsN,
        exclusions: exclusionsN,
      });
    });
  }

  return (
    <li
      className={cn(
        "bg-paper flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
        isMvp ? "border-ball-gold bg-ball-gold/5" : "border-ink-300",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={entry.player.full_name} src={entry.player.photo_url} size={40} />
        <div className="flex flex-col">
          <span className="font-display text-pool-deep text-base font-bold">
            {entry.player.full_name}
          </span>
          {entry.callup.cap_number != null ? (
            <span className="text-ink-600 font-mono text-xs">Dorsal {entry.callup.cap_number}</span>
          ) : null}
        </div>
      </div>
      <div className="border-ink-200 flex items-center justify-between gap-3 border-t pt-2 sm:border-t-0 sm:pt-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`goals-${entry.callup.player_id}`}
              className="text-ink-600 text-xs font-bold uppercase"
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
              className="h-10 w-12 px-1 py-1 text-center font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`excl-${entry.callup.player_id}`}
              className="text-ink-600 text-xs font-bold uppercase"
            >
              Excl.
            </label>
            <Input
              id={`excl-${entry.callup.player_id}`}
              type="number"
              min={0}
              max={3}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              onBlur={commit}
              disabled={disabled}
              className="h-10 w-12 px-1 py-1 text-center font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMvp ? (
            <div
              title="MVP del partido (calculado automáticamente)"
              className="border-ball-gold bg-ball-gold/20 text-pool-deep inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded border"
            >
              <MdStar className="text-ball-gold h-6 w-6" aria-hidden="true" />
            </div>
          ) : (
            <div
              title="No es MVP"
              className="text-ink-300 inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded border border-transparent"
            >
              <MdStarBorder className="text-ink-300 h-6 w-6" aria-hidden="true" />
            </div>
          )}

          {pending ? (
            <MdAutorenew
              className="text-ink-600 h-5 w-5 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <div className="h-5 w-5 shrink-0" />
          )}
        </div>
      </div>
    </li>
  );
}

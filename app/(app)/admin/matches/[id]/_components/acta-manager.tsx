"use client";

import { CheckCircle2, Loader2, Minus, Plus, Save, Star } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  saveMatchSheet,
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

type StatDraft = Record<string, { goals: number; exclusions: number }>;

export function ActaManager({ match, entries }: ActaManagerProps) {
  const router = useRouter();
  const [scoreUs, setScoreUs] = useState(match.final_score_us ?? 0);
  const [scoreThem, setScoreThem] = useState(match.final_score_them ?? 0);
  const [draft, setDraft] = useState<StatDraft>(() =>
    Object.fromEntries(
      entries.map((entry) => [
        entry.player.id,
        { goals: entry.stat?.goals ?? 0, exclusions: entry.stat?.exclusions ?? 0 },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const validated = entries.some((entry) => entry.stat?.validated_at != null);
  const totalGoals = useMemo(
    () => Object.values(draft).reduce((total, item) => total + item.goals, 0),
    [draft],
  );

  function sheetInput() {
    return {
      match_id: match.id,
      final_score_us: scoreUs,
      final_score_them: scoreThem,
      stats: entries.map((entry) => ({
        player_id: entry.player.id,
        goals: draft[entry.player.id]?.goals ?? 0,
        exclusions: draft[entry.player.id]?.exclusions ?? 0,
      })),
    };
  }

  function changeStat(playerId: string, field: "goals" | "exclusions", delta: number) {
    setDraft((current) => {
      const previous = current[playerId] ?? { goals: 0, exclusions: 0 };
      const max = field === "goals" ? 99 : 3;
      return {
        ...current,
        [playerId]: {
          ...previous,
          [field]: Math.max(0, Math.min(max, previous[field] + delta)),
        },
      };
    });
  }

  function save() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await saveMatchSheet(sheetInput());
        setSuccess("Acta y resultado guardados.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos guardar el acta.");
      }
    });
  }

  function validate() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await saveMatchSheet(sheetInput());
        await validateMatchStats(match.id);
        setSuccess("Acta validada. Los rankings ya pueden usar estos datos.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos validar el acta.");
      }
    });
  }

  if (entries.length === 0) {
    return (
      <div className="border-ink-300 bg-paper-card rounded-2xl border border-dashed p-6 text-center">
        <p className="text-pool-deep font-extrabold">Primero prepara la convocatoria</p>
        <p className="text-ink-600 mt-1 text-sm">
          El acta se completa con los jugadores convocados.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <Alert variant="danger" title="No se ha guardado">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Todo listo">
          {success}
        </Alert>
      ) : null}

      <section className="bg-pool-deep text-paper shadow-elev-3 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-paper/60 text-xs font-extrabold tracking-[0.12em] uppercase">
              Resultado
            </p>
            <h3 className="font-display mt-1 text-xl font-extrabold">Marcador final</h3>
          </div>
          <span className="text-paper/70 text-xs font-bold">{totalGoals} goles en el acta</span>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <ScoreControl
            label="Morvedre"
            value={scoreUs}
            onChange={setScoreUs}
            disabled={validated}
          />
          <span className="text-paper/45 pb-4 text-2xl font-black">–</span>
          <ScoreControl
            label="Rival"
            value={scoreThem}
            onChange={setScoreThem}
            disabled={validated}
          />
        </div>
      </section>

      <section aria-labelledby="player-stats-title" className="flex flex-col gap-3">
        <div>
          <h3
            id="player-stats-title"
            className="font-display text-pool-deep text-lg font-extrabold"
          >
            Estadísticas por jugador
          </h3>
          <p className="text-ink-600 mt-0.5 text-sm">
            Usa + y −. No necesitas escribir en campos pequeños.
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const values = draft[entry.player.id] ?? { goals: 0, exclusions: 0 };
            return (
              <li
                key={entry.player.id}
                className={cn(
                  "border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-3",
                  entry.stat?.mvp && "border-ball-gold/60 bg-ball-gold/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={entry.player.full_name} src={entry.player.photo_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-pool-deep truncate font-extrabold">
                      {entry.player.full_name}
                    </p>
                    {entry.stat?.mvp ? (
                      <p className="text-ink-600 mt-0.5 flex items-center gap-1 text-xs font-bold">
                        <Star
                          className="text-ball-gold h-3.5 w-3.5 fill-current"
                          aria-hidden="true"
                        />
                        MVP calculado
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Stepper
                    label="Goles"
                    value={values.goals}
                    onDecrease={() => changeStat(entry.player.id, "goals", -1)}
                    onIncrease={() => changeStat(entry.player.id, "goals", 1)}
                    disabled={validated}
                  />
                  <Stepper
                    label="Expulsiones"
                    value={values.exclusions}
                    onDecrease={() => changeStat(entry.player.id, "exclusions", -1)}
                    onIncrease={() => changeStat(entry.player.id, "exclusions", 1)}
                    disabled={validated}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="border-ink-200 bg-paper/95 shadow-elev-4 sticky bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-10 flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur sm:static sm:flex-row sm:justify-end sm:bg-transparent sm:p-0 sm:shadow-none">
        <Button
          type="button"
          size="lg"
          onClick={save}
          disabled={pending || validated}
          className="sm:min-w-48"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-5 w-5" aria-hidden="true" />
          )}
          {pending ? "Guardando…" : "Guardar acta"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={validate}
          disabled={pending || validated}
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {validated ? "Acta validada" : "Validar y cerrar"}
        </Button>
      </div>
    </div>
  );
}

function ScoreControl({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-paper/70 text-xs font-extrabold uppercase">{label}</p>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={value}
        onChange={(event) => onChange(Math.max(0, Math.min(99, Number(event.target.value) || 0)))}
        disabled={disabled}
        className="bg-paper/10 text-paper focus-visible:ring-ball-gold mt-1 h-16 w-full rounded-xl border border-white/15 text-center font-mono text-4xl font-black outline-none focus-visible:ring-2"
      />
    </div>
  );
}

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
  disabled,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-ink-200 bg-paper-sunk rounded-xl border p-2">
      <p className="text-ink-600 text-center text-xs font-extrabold uppercase">{label}</p>
      <div className="mt-1 grid grid-cols-[3rem_1fr_3rem] items-center">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || value === 0}
          className="border-ink-200 bg-paper-card text-pool-deep focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-35"
          aria-label={`Restar ${label.toLowerCase()}`}
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-pool-deep text-center font-mono text-2xl font-black tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled}
          className="bg-pool-deep text-paper focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Sumar ${label.toLowerCase()}`}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

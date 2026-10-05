"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { Input } from "@/components/ui/input";
import {
  formatSwimTime,
  madridToday,
  parseSwimTime,
  type SwimTimeEntryInput,
} from "@/lib/domain/swim-times";
import { updateSwimTime, voidSwimTime } from "@/server/actions/swim-times";

export function SwimHistoryList({
  initialEntries,
  editableTeamIds,
}: {
  initialEntries: SwimTimeEntryInput[];
  editableTeamIds: string[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const editable = new Set(editableTeamIds);
  if (entries.length === 0) {
    return (
      <div className="border-pool-deep/65 bg-paper-card text-pool-deep rounded-2xl border border-solid p-7 text-center">
        Todavía no hay tiempos registrados.
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <HistoryEntry
            entry={entry}
            canEdit={editable.has(entry.team_id)}
            onChange={(next) =>
              setEntries((current) => current.map((item) => (item.id === next.id ? next : item)))
            }
            onVoid={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}
          />
        </li>
      ))}
    </ol>
  );
}

function HistoryEntry({
  entry,
  canEdit,
  onChange,
  onVoid,
}: {
  entry: SwimTimeEntryInput;
  canEdit: boolean;
  onChange: (entry: SwimTimeEntryInput) => void;
  onVoid: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.test_date);
  const [time50, setTime50] = useState(entry.time_50_cs ? inputValue(entry.time_50_cs) : "");
  const [time100, setTime100] = useState(entry.time_100_cs ? inputValue(entry.time_100_cs) : "");
  const [error, setError] = useState("");
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const busy = useRef(false);

  function save() {
    if (busy.current) return;
    const parsed50 = time50.trim() ? parseSwimTime(time50, 50) : null;
    const parsed100 = time100.trim() ? parseSwimTime(time100, 100) : null;
    if ((!parsed50 && !parsed100) || (parsed50 && !parsed50.ok) || (parsed100 && !parsed100.ok)) {
      setError("Revisa los tiempos. Debe haber al menos uno válido.");
      return;
    }
    const hasWarning = (parsed50?.ok && parsed50.warning) || (parsed100?.ok && parsed100.warning);
    if (hasWarning && !warningAccepted) {
      setWarningAccepted(true);
      setError("El tiempo parece poco habitual. Revísalo y pulsa otra vez para guardarlo.");
      return;
    }
    const time50Cs = parsed50?.ok ? parsed50.centiseconds : null;
    const time100Cs = parsed100?.ok ? parsed100.centiseconds : null;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await updateSwimTime({
          entryId: entry.id,
          revision: entry.revision,
          testDate: date,
          time50Cs,
          time100Cs,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onChange({
          ...entry,
          revision: result.revision,
          test_date: date,
          time_50_cs: time50Cs,
          time_100_cs: time100Cs,
        });
        setEditing(false);
        setError("");
        setWarningAccepted(false);
      } catch {
        setError(
          "No pudimos confirmar el cambio. Actualiza el historial antes de intentarlo de nuevo.",
        );
      } finally {
        busy.current = false;
      }
    });
  }

  function voidEntry() {
    setError("");
    setVoidConfirmOpen(true);
  }

  function confirmVoidEntry() {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await voidSwimTime({ entryId: entry.id, revision: entry.revision });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setVoidConfirmOpen(false);
        onVoid();
      } catch {
        setError(
          "No pudimos confirmar la anulación. Actualiza el historial antes de intentarlo de nuevo.",
        );
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <article className="border-pool-deep/65 bg-paper-card overflow-hidden rounded-2xl border-2 shadow-sm">
      <ActaGuardSheet
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        context="TIEMPOS DE NADO"
        title="¿Anular esta anotación?"
        summary={formatDate(entry.test_date)}
        description="Dejará de aparecer en la ficha y los rankings."
        icon="warning"
        pending={pending}
        error={error}
        actions={[
          {
            label: "Mantener anotación",
            tone: "primary",
            onClick: () => setVoidConfirmOpen(false),
          },
          { label: "Anular anotación", tone: "danger", onClick: confirmVoidEntry },
        ]}
      />
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <time dateTime={entry.test_date} className="text-pool-deep font-extrabold">
            {formatDate(entry.test_date)}
          </time>
          <p className="text-pool-deep mt-1 text-sm">{entry.season_label}</p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={pending}
            className="border-pool-deep/65 text-pool-blue border-2 bg-blue-50"
            onClick={() => setEditing((value) => !value)}
            aria-label={editing ? "Cerrar corrección" : "Corregir anotación"}
          >
            {editing ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Pencil className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-2 px-3 pb-3">
        <TimeValue label="50 m" value={entry.time_50_cs} />
        <TimeValue label="100 m" value={entry.time_100_cs} />
      </dl>
      {editing ? (
        <div className="border-pool-deep/65 flex flex-col gap-3 p-4">
          <div className="grid gap-3 min-[390px]:grid-cols-2">
            <label className="text-pool-deep text-sm font-extrabold">
              50 m
              <Input
                className="border-pool-deep/65 mt-1.5 bg-white"
                disabled={pending}
                inputMode="decimal"
                value={time50}
                onChange={(event) => {
                  setTime50(event.target.value);
                  setWarningAccepted(false);
                }}
              />
            </label>
            <label className="text-pool-deep text-sm font-extrabold">
              100 m
              <Input
                className="border-pool-deep/65 mt-1.5 bg-white"
                disabled={pending}
                inputMode="decimal"
                value={time100}
                onChange={(event) => {
                  setTime100(event.target.value);
                  setWarningAccepted(false);
                }}
              />
            </label>
            <label className="text-pool-deep text-sm font-extrabold">
              Fecha
              <Input
                className="border-pool-deep/65 mt-1.5 bg-white"
                disabled={pending}
                type="date"
                value={date}
                max={madridToday()}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>
          {error ? (
            <p role="alert" className="text-sm font-bold text-red-900">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
            <Button type="button" onClick={save} disabled={pending}>
              {pending
                ? "Guardando…"
                : warningAccepted
                  ? "Guardar de todos modos"
                  : "Guardar cambios"}
            </Button>
            <Button type="button" variant="danger" onClick={voidEntry} disabled={pending}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Anular anotación
            </Button>
          </div>
        </div>
      ) : error ? (
        <p role="alert" className="border-pool-deep/65 px-4 py-3 text-sm font-bold text-red-900">
          {error}
        </p>
      ) : null}
    </article>
  );
}

function TimeValue({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-pool-deep/65 rounded-xl border bg-blue-50 px-3 py-3 text-center">
      <dt className="text-sm font-extrabold text-slate-700 uppercase">{label}</dt>
      <dd className="text-pool-deep mt-1 font-mono text-xl font-extrabold tabular-nums">
        {value ? formatSwimTime(value) : "—"}
      </dd>
    </div>
  );
}

function inputValue(value: number): string {
  return formatSwimTime(value).replace(" s", "");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

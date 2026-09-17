"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";

import { updateCallupResult } from "@/server/actions/admin/matches";
import { deleteCallup, type CallupRow } from "@/server/actions/admin";

import { CapNumberButton, CapNumberOptions } from "./cap-number-picker";

export interface CallupEntry {
  callup: CallupRow;
  player: {
    id: string;
    full_name: string;
    photo_url: string | null;
    birth_year: number | null;
    category_code: string | null;
  } | null;
  sourceTeamLabel: string | null;
  hasConflict: boolean;
}

export function CallupList({ entries }: { entries: CallupEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="border-ink-300 bg-paper-card rounded-2xl border border-dashed p-6 text-center">
        <p className="text-pool-deep font-extrabold">La convocatoria está vacía</p>
        <p className="text-ink-600 mt-1 text-sm">
          Pulsa «Añadir jugadores» para elegir quién viene.
        </p>
      </div>
    );
  }

  const unavailable = entries.filter((entry) =>
    ["declined", "withdrawn", "no_show"].includes(entry.callup.status),
  ).length;

  return (
    <div className="flex flex-col gap-3">
      {unavailable > 0 ? (
        <div
          className="flex flex-wrap gap-2 text-xs font-extrabold"
          aria-label="Resumen de convocatoria"
        >
          <span className="bg-danger/10 text-danger rounded-lg px-2.5 py-1.5">
            {unavailable} bajas
          </span>
        </div>
      ) : null}
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <CallupRowItem key={entry.callup.player_id} entry={entry} entries={entries} />
        ))}
      </ul>
    </div>
  );
}

function CallupRowItem({ entry, entries }: { entry: CallupEntry; entries: CallupEntry[] }) {
  const router = useRouter();
  const [capDraft, setCapDraft] = useState(
    entry.callup.cap_number != null ? String(entry.callup.cap_number) : "",
  );
  const [capPickerOpen, setCapPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await action();
        setSaved(true);
        router.refresh();
      } catch (caught) {
        setCapDraft(entry.callup.cap_number != null ? String(entry.callup.cap_number) : "");
        setError(caught instanceof Error ? caught.message : "No pudimos guardar el cambio.");
      }
    });
  }

  async function update(input: { cap_number?: number | null }) {
    const result = await updateCallupResult(entry.callup.match_id, entry.callup.player_id, input);
    if (!result.ok) throw new Error(result.error);
  }
  const occupied = new Set<number>(
    entries
      .filter(
        (other) =>
          other.callup.player_id !== entry.callup.player_id &&
          ["called", "confirmed"].includes(other.callup.status),
      )
      .map((other) => other.callup.cap_number)
      .filter((cap): cap is number => cap != null),
  );
  function commitCap(value: number | null) {
    setCapDraft(value == null ? "" : String(value));
    setCapPickerOpen(false);
    run(() => update({ cap_number: value }));
  }

  function remove() {
    setError(null);
    setRemoveConfirmOpen(true);
  }

  function confirmRemove() {
    run(async () => {
      await deleteCallup(entry.callup.match_id, entry.callup.player_id);
      setRemoveConfirmOpen(false);
    });
  }

  const cannotAttend =
    entry.hasConflict || ["declined", "withdrawn", "no_show"].includes(entry.callup.status);

  return (
    <li className="border-ink-200 bg-paper-card rounded-2xl border-2 p-2.5 shadow-sm">
      <ConfirmActionSheet
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title="Quitar de la convocatoria"
        description={`¿Quitar a ${entry.player?.full_name ?? "este jugador"} de la convocatoria?`}
        confirmLabel="Sí, quitar jugador"
        isPending={pending}
        error={error}
        onConfirm={confirmRemove}
      />
      <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2">
        <CapNumberButton
          value={capDraft && Number(capDraft) <= 14 ? Number(capDraft) : null}
          open={capPickerOpen}
          disabled={pending}
          label={`Cambiar gorro de ${entry.player?.full_name ?? "jugador"}`}
          onClick={() => setCapPickerOpen((current) => !current)}
        />
        <div className="min-w-0">
          <p className="text-pool-deep text-sm leading-snug font-bold break-words sm:text-base">
            {entry.player?.full_name ?? "Jugador sin nombre"}
          </p>
          {cannotAttend ? (
            <p className="text-danger mt-1 flex items-center gap-1 text-xs font-bold">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              Ha indicado que no puede ir
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Quitar a ${entry.player?.full_name ?? "jugador"} de la convocatoria`}
          className="border-danger/20 bg-danger/5 text-danger focus-visible:outline-danger flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-extrabold focus-visible:outline-2 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          Quitar
        </button>
      </div>
      {capPickerOpen ? (
        <div className="mt-2">
          <CapNumberOptions
            value={capDraft && Number(capDraft) <= 14 ? Number(capDraft) : null}
            occupied={occupied}
            onChange={commitCap}
          />
        </div>
      ) : null}
      <p role="status" className="text-ink-600 text-xs">
        {pending ? "Guardando…" : saved ? "Cambio guardado" : null}
      </p>
      {error ? (
        <Alert variant="danger" title="No se ha guardado">
          {error}
        </Alert>
      ) : null}
    </li>
  );
}

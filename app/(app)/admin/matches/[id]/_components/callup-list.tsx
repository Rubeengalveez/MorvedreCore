"use client";

import { AlertTriangle, ArrowUpRight, Check, Loader2, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { cn } from "@/lib/utils/cn";
import { deleteCallup, updateCallup, type CallupRow } from "@/server/actions/admin";

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

const STATUS_LABELS: Record<string, string> = {
  called: "Sin responder",
  confirmed: "Confirmado",
  declined: "No puede ir",
  withdrawn: "Baja",
  no_show: "No se presentó",
};

export function CallupList({ entries }: { entries: CallupEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="border-ink-300 bg-paper-card rounded-2xl border border-dashed p-6 text-center">
        <p className="text-pool-deep font-extrabold">La convocatoria está vacía</p>
        <p className="text-ink-600 mt-1 text-sm">
          Usa la propuesta para empezar con una base razonada.
        </p>
      </div>
    );
  }

  const confirmed = entries.filter((entry) => entry.callup.status === "confirmed").length;
  const unavailable = entries.filter((entry) =>
    ["declined", "withdrawn", "no_show"].includes(entry.callup.status),
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2" aria-label="Resumen de convocatoria">
        <Summary value={entries.length} label="Convocados" />
        <Summary value={confirmed} label="Confirmados" tone="success" />
        <Summary value={unavailable} label="Bajas" tone="danger" />
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <CallupRowItem key={entry.callup.player_id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

function CallupRowItem({ entry }: { entry: CallupEntry }) {
  const router = useRouter();
  const [capDraft, setCapDraft] = useState(
    entry.callup.cap_number != null ? String(entry.callup.cap_number) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const categoryLabel = entry.player?.category_code
    ? (CATEGORY_LABELS[entry.player.category_code as CategoryCode] ?? entry.player.category_code)
    : null;

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos guardar el cambio.");
      }
    });
  }

  function commitCap() {
    const value = Number(capDraft);
    if (!Number.isInteger(value) || value < 0 || value > 99) {
      setError("El dorsal debe estar entre 0 y 99.");
      return;
    }
    if (value === entry.callup.cap_number) return;
    run(() => updateCallup(entry.callup.match_id, entry.callup.player_id, { cap_number: value }));
  }

  function remove() {
    if (
      !window.confirm(`¿Quitar a ${entry.player?.full_name ?? "este jugador"} de la convocatoria?`)
    )
      return;
    run(() => deleteCallup(entry.callup.match_id, entry.callup.player_id));
  }

  function setStatus(status: "confirmed" | "declined") {
    run(() => updateCallup(entry.callup.match_id, entry.callup.player_id, { status }));
  }

  const statusTone =
    entry.callup.status === "confirmed"
      ? "bg-success/10 text-success"
      : ["declined", "withdrawn", "no_show"].includes(entry.callup.status)
        ? "bg-danger/10 text-danger"
        : "bg-pool-foam text-pool-deep";

  return (
    <li
      className={cn(
        "border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-3",
        entry.hasConflict && "border-danger/35",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={entry.player?.full_name ?? "?"}
          src={entry.player?.photo_url ?? null}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <p className="text-pool-deep truncate font-extrabold">
            {entry.player?.full_name ?? "Jugador sin nombre"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {categoryLabel ? (
              <span className="text-ink-600 text-xs font-bold">{categoryLabel}</span>
            ) : null}
            {entry.sourceTeamLabel ? (
              <span className="text-pool-blue flex items-center gap-1 text-xs font-bold">
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                {entry.sourceTeamLabel}
              </span>
            ) : null}
            {entry.hasConflict ? (
              <span className="text-danger flex items-center gap-1 text-xs font-extrabold">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Marcó que no puede
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold", statusTone)}
        >
          {STATUS_LABELS[entry.callup.status] ?? entry.callup.status}
        </span>
      </div>

      <div className="border-ink-200 mt-3 grid grid-cols-[5.5rem_1fr_auto] items-end gap-2 border-t pt-3">
        <label className="text-ink-600 text-xs font-extrabold uppercase">
          Dorsal
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={capDraft}
            onChange={(event) => setCapDraft(event.target.value)}
            onBlur={commitCap}
            className="mt-1 h-12 text-center font-mono text-lg"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStatus("confirmed")}
            disabled={pending}
            className={cn(
              "focus-visible:ring-pool-blue flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-extrabold focus-visible:ring-2 focus-visible:outline-none",
              entry.callup.status === "confirmed"
                ? "border-success bg-success text-paper"
                : "border-success/30 text-success",
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Confirma
          </button>
          <button
            type="button"
            onClick={() => setStatus("declined")}
            disabled={pending}
            className={cn(
              "focus-visible:ring-pool-blue flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-extrabold focus-visible:ring-2 focus-visible:outline-none",
              entry.callup.status === "declined"
                ? "border-danger bg-danger text-paper"
                : "border-danger/30 text-danger",
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            No puede
          </button>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="border-ink-200 text-danger focus-visible:ring-danger flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Quitar a ${entry.player?.full_name ?? "jugador"}`}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <Alert variant="danger" title="No se ha guardado">
          {error}
        </Alert>
      ) : null}
    </li>
  );
}

function Summary({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "border-ink-200 bg-paper-card rounded-xl border px-2 py-3 text-center",
        tone === "success" && "border-success/25",
        tone === "danger" && "border-danger/25",
      )}
    >
      <p
        className={cn(
          "text-pool-deep font-mono text-xl font-black",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </p>
      <p className="text-ink-500 mt-0.5 truncate text-xs font-bold">{label}</p>
    </div>
  );
}

"use client";

import { MdNorthEast, MdAutorenew, MdWarning, MdCheck, MdDelete } from "react-icons/md";
import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  called: "Convocado",
  confirmed: "Confirmado",
  declined: "Rechazado",
  withdrawn: "Baja",
  no_show: "No se presentó",
};

const STATUS_BADGE: Record<string, string> = {
  called: "bg-brand-aqua/15 text-brand-deep",
  confirmed: "bg-success/15 text-success",
  declined: "bg-danger/15 text-danger",
  withdrawn: "bg-ink-300/40 text-ink-600",
  no_show: "bg-danger/15 text-danger",
};

export interface CallupListProps {
  entries: CallupEntry[];
}

export function CallupList({ entries }: CallupListProps) {
  if (entries.length === 0) {
    return (
      <div className="border-ink-300 bg-paper rounded-md border border-dashed p-6 text-center">
        <p className="text-brand-deep text-base font-semibold">Aún no hay convocatoria.</p>
        <p className="text-ink-600 mt-1 text-sm">
          Pulsa &ldquo;Sugerir convocatoria&rdquo; para empezar.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => (
        <CallupRowItem key={e.callup.player_id} entry={e} />
      ))}
    </ul>
  );
}

function CallupRowItem({ entry }: { entry: CallupEntry }) {
  const [capDraft, setCapDraft] = useState<string>(
    entry.callup.cap_number != null ? String(entry.callup.cap_number) : "",
  );
  const [pending, startTransition] = useTransition();
  const [savingCap, startSavingCap] = useTransition();

  const categoryLabel = entry.player?.category_code
    ? (CATEGORY_LABELS[entry.player.category_code as CategoryCode] ?? entry.player.category_code)
    : null;

  const currentCap = entry.callup.cap_number != null ? entry.callup.cap_number : null;

  function commitCap() {
    if (capDraft.trim() === "") return;
    const value = Number(capDraft);
    if (!Number.isFinite(value) || value === currentCap) return;
    startSavingCap(async () => {
      await updateCallup(entry.callup.match_id, entry.callup.player_id, { cap_number: value });
    });
  }

  function remove() {
    if (
      !window.confirm(`¿Quitar a ${entry.player?.full_name ?? "este jugador"} de la convocatoria?`)
    ) {
      return;
    }
    startTransition(async () => {
      await deleteCallup(entry.callup.match_id, entry.callup.player_id);
    });
  }

  function setStatus(status: CallupRow["status"]) {
    startTransition(async () => {
      await updateCallup(entry.callup.match_id, entry.callup.player_id, {
        status: status as "called" | "confirmed" | "declined" | "withdrawn" | "no_show",
      });
    });
  }

  return (
    <li
      className={cn(
        "bg-paper flex flex-col gap-2 rounded-md border p-3",
        entry.hasConflict ? "border-danger/30" : "border-ink-300",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={entry.player?.full_name ?? "?"}
          src={entry.player?.photo_url ?? null}
          size={40}
        />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-brand-deep text-base font-bold">
              {entry.player?.full_name ?? "Jugador sin nombre"}
            </span>
            {categoryLabel ? (
              <span className="border-ink-300 text-ink-600 inline-flex h-5 items-center rounded-full border px-1.5 text-[10px] font-semibold">
                {categoryLabel}
              </span>
            ) : null}
            {entry.sourceTeamLabel ? (
              <span className="bg-brand-foam text-brand-deep inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-semibold">
                <MdNorthEast className="h-3.5 w-3.5" aria-hidden="true" />
                {entry.sourceTeamLabel}
              </span>
            ) : null}
            {entry.hasConflict ? (
              <span className="bg-danger/15 text-danger inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-semibold">
                <MdWarning className="h-3.5 w-3.5" aria-hidden="true" />
                No disponible
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "mt-0.5 inline-flex h-5 w-fit items-center rounded-full px-2 text-[10px] font-semibold",
              STATUS_BADGE[entry.callup.status] ?? "border-ink-300 text-ink-600 border",
            )}
          >
            {STATUS_LABELS[entry.callup.status] ?? entry.callup.status}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger/10 h-10 w-10 min-w-10 p-0"
          onClick={remove}
          disabled={pending}
          aria-label="Quitar de la convocatoria"
        >
          {pending ? (
            <MdAutorenew className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MdDelete className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={99}
          value={capDraft}
          onChange={(e) => setCapDraft(e.target.value)}
          onBlur={commitCap}
          className="w-20"
          placeholder="Dorsal"
        />
        {savingCap ? (
          <MdAutorenew className="text-ink-600 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        <div className="ml-auto flex gap-1">
          {entry.callup.status !== "confirmed" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatus("confirmed")}
              disabled={pending}
              className="text-success hover:bg-success/10 h-10"
            >
              <MdCheck className="h-5 w-5" aria-hidden="true" />
              Confirmar
            </Button>
          ) : null}
          {entry.callup.status !== "declined" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatus("declined")}
              disabled={pending}
              className="text-danger hover:bg-danger/10 h-10"
            >
              Baja
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

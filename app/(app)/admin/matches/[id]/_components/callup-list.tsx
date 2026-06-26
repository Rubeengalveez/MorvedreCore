"use client";

import { ArrowUpRight, Loader2, ShieldAlert, Star, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { cn } from "@/lib/utils/cn";
import {
  deleteCallup,
  updateCallup,
  type CallupRow,
} from "@/server/actions/admin";

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
      <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
        <p className="text-base font-semibold text-brand-deep">
          Aún no hay convocatoria.
        </p>
        <p className="mt-1 text-sm text-ink-600">
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
    ? CATEGORY_LABELS[entry.player.category_code as CategoryCode] ??
      entry.player.category_code
    : null;

  const currentCap = entry.callup.cap_number != null ? entry.callup.cap_number : null;

  function commitCap() {
    if (capDraft.trim() === "") return;
    const value = Number(capDraft);
    if (!Number.isFinite(value) || value === currentCap) return;
    startSavingCap(async () => {
      await updateCallup(
        entry.callup.match_id,
        entry.callup.player_id,
        { cap_number: value },
      );
    });
  }

  function remove() {
    if (
      !window.confirm(
        `¿Quitar a ${entry.player?.full_name ?? "este jugador"} de la convocatoria?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteCallup(entry.callup.match_id, entry.callup.player_id);
    });
  }

  function setStatus(status: CallupRow["status"]) {
    startTransition(async () => {
      await updateCallup(
        entry.callup.match_id,
        entry.callup.player_id,
        {
          status: status as
            | "called"
            | "confirmed"
            | "declined"
            | "withdrawn"
            | "no_show",
        },
      );
    });
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-paper p-3",
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
            <span className="font-display text-base font-bold text-brand-deep">
              {entry.player?.full_name ?? "Jugador sin nombre"}
            </span>
            {categoryLabel ? (
              <span className="inline-flex h-5 items-center rounded-full border border-ink-300 px-1.5 text-[10px] font-semibold text-ink-600">
                {categoryLabel}
              </span>
            ) : null}
            {entry.sourceTeamLabel ? (
              <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-brand-foam px-1.5 text-[10px] font-semibold text-brand-deep">
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                {entry.sourceTeamLabel}
              </span>
            ) : null}
            {entry.hasConflict ? (
              <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-danger/15 px-1.5 text-[10px] font-semibold text-danger">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                No disponible
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "mt-0.5 inline-flex h-5 w-fit items-center rounded-full px-2 text-[10px] font-semibold",
              STATUS_BADGE[entry.callup.status] ?? "border border-ink-300 text-ink-600",
            )}
          >
            {STATUS_LABELS[entry.callup.status] ?? entry.callup.status}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 min-w-10 p-0 text-danger hover:bg-danger/10"
          onClick={remove}
          disabled={pending}
          aria-label="Quitar de la convocatoria"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
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
          <Loader2 className="h-4 w-4 animate-spin text-ink-600" aria-hidden="true" />
        ) : null}
        <div className="ml-auto flex gap-1">
          {entry.callup.status !== "confirmed" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatus("confirmed")}
              disabled={pending}
              className="h-10 text-success hover:bg-success/10"
            >
              <Star className="h-4 w-4" aria-hidden="true" />
              Confirmar
            </Button>
          ) : null}
          {entry.callup.status !== "declined" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatus("declined")}
              disabled={pending}
              className="h-10 text-danger hover:bg-danger/10"
            >
              Baja
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

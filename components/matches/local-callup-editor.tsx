"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { Alert } from "@/components/ui/alert";
import { PageShell } from "@/components/ui/page-shell";
import { CallupEditor } from "@/app/(app)/admin/matches/[id]/_components/callup-editor";
import { editLiveRoster, type RosterTransfer } from "@/lib/domain/live-match-roster-edit";
import { liveCallupReturn } from "@/lib/domain/live-match-navigation";
import type { CallupPick } from "@/lib/domain/callup-selection";
import {
  liveDevice,
  readLocalMatch,
  writeLocalMatch,
  type StoredMatch,
} from "@/lib/pwa/live-match-store";
import { generateUuid } from "@/lib/utils/uuid";

export function LocalCallupEditor() {
  const [record, setRecord] = useState<StoredMatch>();
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const matchId = params.get("match");
    const from = params.get("from");
    setOrigin(from);
    if (!matchId) {
      queueMicrotask(() => setError("Abre la convocatoria desde el partido."));
      return;
    }
    let stopped = false;
    let release: () => void = () => {};
    const connection = () => setOnline(navigator.onLine);
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const run = async (lock: unknown) => {
      if (!lock) {
        setError("El acta está abierta en otra pestaña. Ciérrala antes de editar la convocatoria.");
        return;
      }
      try {
        const local = await readLocalMatch(matchId);
        if (!local)
          throw new Error(
            "Abre el acta de este partido una vez para preparar la edición en este móvil.",
          );
        if (!local.canEdit || (local.revision > 0 && local.device !== liveDevice()))
          throw new Error(
            "Este móvil no tiene el control del acta. Abre el acta para tomar el relevo.",
          );
        if (local.sheet.phase === "finished") throw new Error("El acta ya está cerrada.");
        if (local.sheet.pending)
          throw new Error("Termina la jugada pendiente antes de editar la convocatoria.");
        if (!stopped) setRecord(local);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      } catch (caught) {
        if (!stopped)
          setError(caught instanceof Error ? caught.message : "No pudimos abrir la convocatoria.");
      }
    };
    if (navigator.locks)
      void navigator.locks.request(`acta:${matchId}`, { ifAvailable: true }, run);
    else void run({});
    return () => {
      stopped = true;
      release();
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);

  if (!record)
    return (
      <PageShell width="md" className="min-h-dvh py-5">
        {error ? (
          <Alert variant="danger" title="No se puede editar la convocatoria">
            {error}
          </Alert>
        ) : (
          <p className="text-pool-deep font-bold" role="status">
            Preparando la convocatoria…
          </p>
        )}
        <a href="/calendar" className="text-pool-blue inline-flex min-h-12 items-center font-bold">
          Volver al calendario
        </a>
      </PageShell>
    );

  const active = record.sheet.players.filter((player) => !player.retired);
  const candidates = new Map(
    (record.callupCandidates ?? []).map((player) => [player.player_id, player]),
  );
  for (const player of active) {
    if (!candidates.has(player.id))
      candidates.set(player.id, {
        player_id: player.id,
        full_name: player.name,
        cap_number: player.cap,
        has_conflict: false,
        is_current_team: true,
      });
  }
  const back = liveCallupReturn(record.matchId, origin);

  async function save(players: CallupPick[], transfers: RosterTransfer[]) {
    const selected = players.map((pick) => ({
      id: pick.player_id,
      cap: pick.cap_number ?? 0,
      name: candidates.get(pick.player_id)?.full_name ?? "Jugador",
    }));
    const sheet = editLiveRoster(record!.sheet, selected, transfers);
    const next: StoredMatch = {
      ...record!,
      sheet,
      mutation: generateUuid(),
      dirty: true,
      rosterEdit: true,
    };
    await writeLocalMatch(next);
    setRecord(next);
  }

  return (
    <PageShell width="md" className="min-h-dvh gap-3 pb-8">
      {!online ? (
        <p className="text-pool-deep px-1 text-sm font-bold" role="status">
          Sin conexión · puedes corregir la convocatoria. Se enviará cuando vuelva la conexión.
        </p>
      ) : null}
      {!record.callupCandidates ? (
        <Alert variant="warning" title="Lista de jugadores no preparada">
          Puedes cambiar los gorros. Para añadir otro jugador, abre este partido una vez con
          conexión.
        </Alert>
      ) : null}
      <CallupEditor
        matchId={record.matchId}
        teamLabel={record.team}
        opponent={record.opponent}
        scheduledAt={record.date}
        initial={active.map((player) => ({ player_id: player.id, cap_number: player.cap }))}
        candidates={[...candidates.values()]}
        template={record.callupTemplate ?? []}
        editable
        backHref={back.href as Route}
        backLabel={back.label}
        liveSheet={record.sheet}
        online={online}
        onSaveLive={save}
      />
    </PageShell>
  );
}

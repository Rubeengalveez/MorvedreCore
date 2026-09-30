"use client";

import { useSyncExternalStore } from "react";
import type { Route } from "next";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { ActaLoadingIndicator } from "./acta-loading-indicator";
import { Alert } from "@/components/ui/alert";
import { PageShell } from "@/components/ui/page-shell";
import { CallupEditor } from "@/app/(app)/admin/matches/[id]/_components/callup-editor";
import { editLiveRoster, type RosterTransfer } from "@/lib/domain/live-match-roster-edit";
import { liveCallupReturn } from "@/lib/domain/live-match-navigation";
import type { CallupPick } from "@/lib/domain/callup-selection";
import { liveDevice } from "@/lib/pwa/live-match-store";
import { useLiveMatch } from "@/components/matches/use-live-match";

const subscribeToLocation = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};

export function LocalCallupEditor() {
  const { record, error, online, writable, busy, change, retry } = useLiveMatch();
  const search = useSyncExternalStore(
    subscribeToLocation,
    () => location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  const origin = params.get("from");
  const matchParam = params.get("match");
  const sourceMatchId =
    matchParam && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(matchParam)
      ? matchParam
      : null;

  const loadingBack = sourceMatchId
    ? liveCallupReturn(sourceMatchId, origin)
    : { href: "/calendar", label: "Volver al calendario" };
  const blocked = record
    ? !record.canEdit || (record.revision > 0 && record.device !== liveDevice())
      ? "Este móvil no tiene el control del acta. Abre el acta para tomar el relevo."
      : record.sheet.phase === "finished"
        ? "El acta ya está cerrada."
        : record.sheet.pending
          ? "Termina la jugada pendiente antes de editar la convocatoria."
          : !writable && error
            ? error
            : ""
    : "";
  if (!record || blocked || !writable)
    return (
      <main
        id="main-content"
        className="bg-pool-ice text-pool-deep flex min-h-dvh flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <header className="bg-pool-deep pt-[env(safe-area-inset-top)] text-white">
          <div className="mx-auto max-w-lg px-4 pb-6">
            <a
              href={loadingBack.href}
              className="mb-4 -ml-2 inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-yellow-300"
            >
              <ArrowLeft size={20} aria-hidden="true" />
              {loadingBack.label}
            </a>
            <div className="flex items-center gap-3">
              <ClipboardList size={32} aria-hidden="true" />
              <div>
                <p className="text-sm text-blue-100">Espacio del delegado</p>
                <h1 className="text-2xl font-extrabold">Editar convocatoria</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-5 py-8">
          {blocked || error ? (
            <Alert variant="danger" title="No se puede editar la convocatoria">
              {blocked || error}
            </Alert>
          ) : (
            <ActaLoadingIndicator
              title="Preparando la convocatoria…"
              description="Recuperando los jugadores y los cambios guardados."
            />
          )}
        </div>
      </main>
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
    if (!(await change(sheet, { rosterEdit: true })))
      throw new Error("No se ha guardado la convocatoria. Inténtalo de nuevo.");
  }

  return (
    <PageShell width="md" className="min-h-dvh gap-3 pb-8">
      {error ? (
        <div
          role="status"
          className="border-pool-deep text-pool-deep rounded-xl border-2 bg-amber-100 p-4"
        >
          <p className="text-base font-bold">Cambios pendientes de sincronizar</p>
          <p className="mt-1 text-base">{error}</p>
          <button
            type="button"
            disabled={!online || busy}
            onClick={() => void retry()}
            className="border-pool-deep mt-3 min-h-12 rounded-xl border-2 bg-white px-4 text-base font-bold disabled:opacity-50"
          >
            Reintentar envío
          </button>
        </div>
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
        editable={writable}
        backHref={back.href as Route}
        backLabel={back.label}
        liveSheet={record.sheet}
        online={online}
        onSaveLive={save}
      />
    </PageShell>
  );
}

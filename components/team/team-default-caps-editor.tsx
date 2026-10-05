"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CapNumberButton, CapNumberOptions } from "@/components/matches/cap-number-picker";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { changeDefaultCap, defaultCapsKey } from "@/lib/domain/team-default-caps";
import type { CallupPick } from "@/lib/domain/callup-selection";
import { saveTeamDefaultCaps } from "@/server/actions/admin/teams";
import { teamSecondary } from "./team-ui";

export interface DefaultCapPlayer extends CallupPick {
  full_name: string;
}

export function TeamDefaultCapsEditor({
  teamId,
  players,
}: {
  teamId: string;
  players: DefaultCapPlayer[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CallupPick[]>(players);
  const [active, setActive] = useState<string | null>(null);
  const [swap, setSwap] = useState<{ id: string; cap: number } | null>(null);
  const [clear, setClear] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const dirty = defaultCapsKey(draft) !== defaultCapsKey(players);
  const names = new Map(players.map((p) => [p.player_id, p.full_name]));
  const other = swap
    ? draft.find((p) => p.player_id !== swap.id && p.cap_number === swap.cap)
    : null;
  const previousCap = swap ? draft.find((p) => p.player_id === swap.id)?.cap_number : null;

  function close(next: boolean) {
    if (pending) return;
    if (!next && dirty) {
      setDiscard(true);
      return;
    }
    setOpen(next);
  }
  async function save() {
    if (busy.current || !dirty) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await saveTeamDefaultCaps({
        team_id: teamId,
        players: draft.map(({ player_id, cap_number }) => ({ player_id, cap_number })),
        expected: players.map(({ player_id, cap_number }) => ({ player_id, cap_number })),
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar los gorros.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={!players.length}
        className={`${teamSecondary} w-full`}
        onClick={() => {
          setDraft(players);
          setActive(null);
          setError(null);
          setOpen(true);
        }}
      >
        Editar gorros por defecto
      </button>
      <ActaGuardSheet
        open={open}
        onOpenChange={close}
        context="CONVOCATORIA POR DEFECTO"
        title="Gorros del equipo"
        icon="saved"
        pending={pending}
        error={error}
        tall
        stickyActions
        description="Estos gorros se usarán en las próximas convocatorias."
        actions={[
          {
            label: pending ? "Guardando…" : "Guardar gorros",
            tone: "primary",
            disabled: !dirty,
            onClick: save,
          },
          { label: "Cancelar", tone: "secondary", onClick: () => close(false) },
        ]}
        body={
          <div className="space-y-3">
            <p className="text-pool-deep border-pool-deep/65 rounded-xl border-2 bg-blue-50 p-3 text-sm font-semibold">
              Los partidos ya creados conservan su convocatoria.
            </p>
            <button
              type="button"
              disabled={pending}
              className={`${teamSecondary} w-full`}
              onClick={() => setClear(true)}
            >
              Dejar todos sin gorro
            </button>
            <ul className="space-y-2">
              {draft.map((p) => (
                <li
                  key={p.player_id}
                  className="border-pool-deep/65 rounded-xl border-2 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <CapNumberButton
                      value={p.cap_number}
                      open={active === p.player_id}
                      disabled={pending}
                      label={`Cambiar gorro de ${names.get(p.player_id)}, ${p.cap_number ?? "sin gorro"}`}
                      onClick={() => setActive(active === p.player_id ? null : p.player_id)}
                    />
                    <p className="text-pool-deep min-w-0 flex-1 font-extrabold">
                      <AdaptivePlayerName name={names.get(p.player_id) ?? "Jugador"} />
                    </p>
                  </div>
                  {active === p.player_id && !pending ? (
                    <div className="mt-3">
                      <CapNumberOptions
                        value={p.cap_number}
                        occupied={
                          new Set(
                            draft
                              .filter((x) => x.player_id !== p.player_id && x.cap_number != null)
                              .map((x) => x.cap_number!),
                          )
                        }
                        onChange={(cap) => {
                          if (
                            cap != null &&
                            draft.some((x) => x.player_id !== p.player_id && x.cap_number === cap)
                          )
                            setSwap({ id: p.player_id, cap });
                          else {
                            setDraft((current) => changeDefaultCap(current, p.player_id, cap));
                            setActive(null);
                            setError(null);
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        }
      />
      <ActaGuardSheet
        open={Boolean(swap)}
        onOpenChange={(next) => {
          if (!next) setSwap(null);
        }}
        context="GORROS"
        title="¿Intercambiar los gorros?"
        icon="warning"
        description={`${swap ? names.get(swap.id) : ""} tendrá el gorro ${swap?.cap ?? ""}. ${other ? names.get(other.player_id) : ""} ${previousCap == null ? "quedará sin gorro" : `tendrá el gorro ${previousCap}`}.`}
        actions={[
          {
            label: "Intercambiar gorros",
            tone: "primary",
            onClick: () => {
              if (swap) setDraft((current) => changeDefaultCap(current, swap.id, swap.cap));
              setSwap(null);
              setActive(null);
              setError(null);
            },
          },
          { label: "Cancelar", tone: "secondary", onClick: () => setSwap(null) },
        ]}
      />
      <ActaGuardSheet
        open={clear}
        onOpenChange={setClear}
        context="GORROS"
        title="¿Dejar todos sin gorro?"
        icon="warning"
        description="Podrás asignarlos de nuevo. Este cambio se aplicará cuando guardes."
        actions={[
          {
            label: "Dejar sin gorros",
            tone: "primary",
            onClick: () => {
              setDraft((current) => current.map((p) => ({ ...p, cap_number: null })));
              setClear(false);
              setActive(null);
              setError(null);
            },
          },
          { label: "Cancelar", tone: "secondary", onClick: () => setClear(false) },
        ]}
      />
      <ActaGuardSheet
        open={discard}
        onOpenChange={setDiscard}
        context="GORROS"
        title="¿Salir sin guardar?"
        icon="warning"
        description="Tienes cambios pendientes en los gorros."
        actions={[
          { label: "Seguir editando", tone: "primary", onClick: () => setDiscard(false) },
          {
            label: "Salir sin guardar",
            tone: "subtle",
            onClick: () => {
              setDiscard(false);
              setOpen(false);
            },
          },
        ]}
      />
    </>
  );
}

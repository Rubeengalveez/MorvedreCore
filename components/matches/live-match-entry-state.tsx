"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ClipboardList, AlertCircle, Check, Loader2, Unlink2 } from "lucide-react";
import { prepareLiveMatch, type ActaPreparation } from "@/server/actions/live-match";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { useActaBackGuard } from "./use-acta-back-guard";

const subscribeToLocation = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};

export function LiveMatchEntryState({
  error,
  preparation,
}: {
  error: string;
  preparation?: ActaPreparation;
}) {
  const matchId = useSyncExternalStore(
    subscribeToLocation,
    () => new URLSearchParams(location.search).get("match") ?? "",
    () => "",
  );
  const [caps, setCaps] = useState(() => preparation?.players.map((p) => p.cap || 0) ?? []);
  const [selectedIds, setSelectedIds] = useState(
    () =>
      new Set(
        preparation?.players
          .slice(0, preparation.reason === "too_many" ? 14 : preparation.players.length)
          .map((player) => player.id) ?? [],
      ),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [clearCapsOpen, setClearCapsOpen] = useState(false);
  const skipUnloadRef = useRef(false);
  const validId = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(matchId);
  const back = validId ? `/matches/${matchId}` : "/calendar";
  const initialSelectedIds =
    preparation?.players
      .slice(0, preparation.reason === "too_many" ? 14 : preparation.players.length)
      .map((player) => player.id) ?? [];
  const dirty =
    Boolean(preparation) &&
    JSON.stringify([caps, [...selectedIds].sort()]) !==
      JSON.stringify([
        preparation?.players.map((player) => player.cap || 0),
        initialSelectedIds.sort(),
      ]);
  const leave = useActaBackGuard(() => {
    if (saving) return;
    if (clearCapsOpen) setClearCapsOpen(false);
    else if (leaveOpen) setLeaveOpen(false);
    else requestLeave();
  }, Boolean(preparation));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (skipUnloadRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function requestLeave() {
    if (dirty) setLeaveOpen(true);
    else leave(back);
  }

  function exitWithoutSaving() {
    skipUnloadRef.current = true;
    setLeaveOpen(false);
    leave(back);
  }
  const selectedCaps = caps.filter((_, index) =>
    selectedIds.has(preparation?.players[index]?.id ?? ""),
  );
  const validCaps =
    selectedCaps.length > 0 &&
    selectedCaps.length <= 14 &&
    selectedCaps.every((cap) => cap > 0 && cap <= 14) &&
    selectedCaps.some((cap) => cap === 1 || cap === 13) &&
    new Set(selectedCaps).size === selectedCaps.length;
  async function save(target?: string) {
    if (!preparation || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await prepareLiveMatch({
        matchId,
        players: preparation.players
          .map((player, index) => ({ id: player.id, cap: caps[index] }))
          .filter((player) => selectedIds.has(player.id)),
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      skipUnloadRef.current = true;
      if (target) leave(target);
      else location.reload();
    } catch {
      setSaveError("No pudimos conectar. Tus cambios siguen aquí; vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main
      id="main-content"
      className={`text-pool-deep min-h-dvh ${preparation ? "bg-paper pb-40" : error ? "bg-paper pb-[max(1rem,env(safe-area-inset-bottom))]" : "bg-pool-ice flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"}`}
    >
      <header className="bg-pool-deep pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto max-w-lg px-4 pb-6">
          <button
            type="button"
            onClick={requestLeave}
            className="mb-4 -ml-2 inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-base font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            {validId ? "Volver al partido" : "Ver calendario"}
          </button>
          <div className="flex items-center gap-3">
            <ClipboardList size={32} aria-hidden="true" />
            <div>
              <p className="text-sm text-blue-100">Espacio del delegado</p>
              <h1 className="text-2xl font-extrabold">Acta del partido</h1>
            </div>
          </div>
        </div>
      </header>
      <div
        className={`mx-auto w-full max-w-lg ${preparation || error ? "space-y-5 px-4 py-6" : "flex flex-1 items-center justify-center px-5 py-8"}`}
      >
        {preparation ? (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-600">
                {preparation.team} · {preparation.opponent}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {preparation.reason === "too_many"
                  ? "Elige los 14 que juegan"
                  : preparation.reason === "keeper"
                    ? "Asigna un portero"
                    : "Revisa los gorros"}
              </h2>
              <p className="mt-2 text-base leading-relaxed">
                {preparation.reason === "too_many"
                  ? `Hay ${preparation.players.length} jugadores en la convocatoria. Marca un máximo de 14 y revisa que sus gorros no se repitan.`
                  : preparation.reason === "keeper"
                    ? "Para abrir el acta, uno de los jugadores debe llevar el gorro 1 o 13. Ese gorro será el portero, independientemente del nombre."
                    : `Tus ${preparation.players.length} jugadores ya están convocados. Solo falta que cada uno tenga un número diferente.`}
              </p>
              {preparation.reason === "too_many" && (
                <p
                  className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-base font-extrabold text-blue-950"
                  role="status"
                >
                  {selectedIds.size} de 14 elegidos
                </p>
              )}
              <button
                type="button"
                disabled={saving || selectedCaps.every((cap) => cap === 0)}
                onClick={() => setClearCapsOpen(true)}
                className="text-pool-deep mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#87add0] bg-white px-4 text-sm font-bold disabled:opacity-50"
              >
                <Unlink2 size={18} aria-hidden="true" />
                Desasignar todos los gorros
              </button>
            </div>
            <div className="grid gap-2">
              {preparation.players.map((p, i) => {
                const selected = selectedIds.has(p.id);
                const duplicate =
                  selected &&
                  caps[i] > 0 &&
                  caps.some(
                    (cap, index) =>
                      index !== i &&
                      selectedIds.has(preparation.players[index]?.id ?? "") &&
                      cap === caps[i],
                  );
                const invalid = selected && (!caps[i] || duplicate);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 ${invalid ? "border-[#a77600] bg-[#fff0bd]" : selected ? "border-[#b8cada] bg-white" : "border-slate-300 bg-slate-100 text-slate-600"}`}
                  >
                    {preparation.reason === "too_many" && (
                      <label className="grid h-12 w-12 shrink-0 place-items-center rounded-lg focus-within:outline-2 focus-within:outline-blue-700">
                        <span className="sr-only">{`${selected ? "Quitar" : "Elegir"} a ${p.name}`}</span>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={saving || (!selected && selectedIds.size >= 14)}
                          onChange={(event) =>
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(p.id);
                              else next.delete(p.id);
                              return next;
                            })
                          }
                          className="h-6 w-6 shrink-0 accent-blue-800"
                        />
                      </label>
                    )}
                    <label
                      htmlFor={`cap-${p.id}`}
                      className="min-w-0 flex-1 text-base font-semibold"
                    >
                      {p.name}
                      <span
                        className={`mt-1 block text-sm font-normal ${invalid ? "text-amber-900" : "text-slate-600"}`}
                      >
                        {!selected
                          ? "No juega este partido"
                          : duplicate
                            ? "Gorro repetido"
                            : !caps[i]
                              ? "Elige su gorro"
                              : "Gorro asignado"}
                      </span>
                    </label>
                    <select
                      id={`cap-${p.id}`}
                      value={caps[i]}
                      aria-invalid={invalid}
                      disabled={saving || !selected}
                      onChange={(e) =>
                        setCaps((values) =>
                          values.map((cap, index) => (index === i ? Number(e.target.value) : cap)),
                        )
                      }
                      className="min-h-12 min-w-20 rounded-lg border border-slate-400 bg-white px-3 text-lg font-bold focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      <option value={0}>—</option>
                      {Array.from({ length: 14 }, (_, n) => n + 1)
                        .filter(
                          (candidate) =>
                            candidate === caps[i] ||
                            !caps.some(
                              (cap, index) =>
                                index !== i &&
                                selectedIds.has(preparation.players[index]?.id ?? "") &&
                                cap === candidate,
                            ),
                        )
                        .map((candidate) => (
                          <option key={candidate} value={candidate}>
                            {candidate}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              })}
            </div>
            {saveError && (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
                {saveError}
              </p>
            )}
            <div className="fixed inset-x-0 bottom-0 z-20 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(6,32,72,0.12)]">
              <div className="mx-auto max-w-lg">
                <p className="mb-2 text-sm text-slate-600" role="status">
                  {validCaps
                    ? `${selectedCaps.length} jugadores listos para abrir el acta.`
                    : selectedCaps.length > 0 &&
                        !selectedCaps.some((cap) => cap === 1 || cap === 13)
                      ? "Asigna el gorro 1 o 13 a un portero."
                      : selectedIds.size > 14
                        ? "Solo pueden jugar 14 personas."
                        : "Elige al menos un jugador y corrige los gorros señalados."}
                </p>
                <button
                  onClick={() => void save()}
                  disabled={!validCaps || saving}
                  className="bg-pool-deep flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-lg font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                  {saving ? "Guardando gorros…" : "Guardar gorros y abrir acta"}
                </button>
              </div>
            </div>
          </>
        ) : error ? (
          <>
            <AlertCircle size={36} className="text-amber-700" aria-hidden="true" />
            <h2 className="text-2xl font-bold">No hemos podido abrir el acta</h2>
            <p role="alert" className="text-base leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => location.reload()}
              className="bg-pool-deep min-h-14 w-full rounded-xl px-4 text-lg font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Volver a intentarlo
            </button>
          </>
        ) : (
          <div role="status" aria-live="polite" aria-busy="true" className="text-center">
            <div
              aria-hidden="true"
              className="bg-pool-deep shadow-elev-2 relative mx-auto mb-7 grid h-20 w-20 place-items-center rounded-2xl text-white"
            >
              <ClipboardList className="h-9 w-9" />
              <span className="bg-ball-gold text-pool-deep ring-pool-ice absolute -right-2 -bottom-2 grid h-9 w-9 place-items-center rounded-full ring-4">
                <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
              </span>
            </div>
            <p className="text-pool-blue text-xs font-extrabold tracking-widest uppercase">
              Acta en directo
            </p>
            <h2 className="font-display mt-2 text-2xl font-extrabold">Preparando tu acta…</h2>
            <p className="text-ink-700 mx-auto mt-3 max-w-xs text-base leading-relaxed">
              Recuperando la convocatoria y las jugadas guardadas.
            </p>
          </div>
        )}
      </div>
      <ActaGuardSheet
        open={clearCapsOpen}
        onOpenChange={setClearCapsOpen}
        context="Preparar acta"
        title="¿Quitar todos los gorros?"
        summary="Los jugadores siguen elegidos"
        description="Solo se borran los números. Asígnalos de nuevo antes de abrir el acta."
        icon="warning"
        actions={[
          {
            label: "Quitar gorros",
            tone: "danger",
            onClick: () => {
              setCaps((current) =>
                current.map((cap, index) =>
                  selectedIds.has(preparation?.players[index]?.id ?? "") ? 0 : cap,
                ),
              );
              setClearCapsOpen(false);
            },
          },
          { label: "Mantener gorros", tone: "primary", onClick: () => setClearCapsOpen(false) },
        ]}
      />
      <ActaGuardSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        context="Preparar acta"
        title="Tienes cambios sin guardar"
        summary={validCaps ? "Puedes guardar la convocatoria" : "Faltan gorros por asignar"}
        description={
          validCaps
            ? "Guarda los gorros antes de volver al partido."
            : "Completa los gorros para guardarlos o descarta los cambios."
        }
        icon="warning"
        pending={saving}
        error={saveError}
        actions={[
          ...(validCaps
            ? [
                {
                  label: "Guardar y salir",
                  tone: "primary" as const,
                  onClick: () => void save(back),
                },
              ]
            : []),
          {
            label: "Seguir editando",
            tone: validCaps ? ("secondary" as const) : ("primary" as const),
            onClick: () => setLeaveOpen(false),
          },
          { label: "Salir sin guardar", tone: "danger", onClick: exitWithoutSaving },
        ]}
      />
    </main>
  );
}

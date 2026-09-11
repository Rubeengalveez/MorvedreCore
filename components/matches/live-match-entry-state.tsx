"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, ClipboardList, AlertCircle, Check, Loader2 } from "lucide-react";
import { prepareLiveMatch, type ActaPreparation } from "@/server/actions/live-match";

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
  const validId = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(matchId);
  const back = validId ? `/matches/${matchId}` : "/calendar";
  const selectedCaps = caps.filter((_, index) =>
    selectedIds.has(preparation?.players[index]?.id ?? ""),
  );
  const validCaps =
    selectedCaps.length > 0 &&
    selectedCaps.length <= 14 &&
    selectedCaps.every((cap) => cap > 0 && cap <= 99) &&
    new Set(selectedCaps).size === selectedCaps.length;
  async function save() {
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
      location.reload();
    } catch {
      setSaveError("No pudimos conectar. Tus cambios siguen aquí; vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main
      id="main-content"
      className={`bg-paper text-pool-deep min-h-dvh ${preparation ? "pb-40" : "pb-[max(1rem,env(safe-area-inset-bottom))]"}`}
    >
      <header className="bg-pool-deep pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto max-w-lg px-4 pb-6">
          <a
            href={back}
            className="mb-4 -ml-2 inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-base font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            {validId ? "Volver al partido" : "Ver calendario"}
          </a>
          <div className="flex items-center gap-3">
            <ClipboardList size={32} aria-hidden="true" />
            <div>
              <p className="text-sm text-blue-100">Espacio del delegado</p>
              <h1 className="text-2xl font-extrabold">Acta del partido</h1>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        {preparation ? (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-600">
                {preparation.team} · {preparation.opponent}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {preparation.reason === "too_many" ? "Elige los 14 que juegan" : "Revisa los gorros"}
              </h2>
              <p className="mt-2 text-base leading-relaxed">
                {preparation.reason === "too_many"
                  ? `Hay ${preparation.players.length} jugadores en la convocatoria. Marca un máximo de 14 y revisa que sus gorros no se repitan.`
                  : `Tus ${preparation.players.length} jugadores ya están convocados. Solo falta que cada uno tenga un número diferente.`}
              </p>
              {preparation.reason === "too_many" && (
                <p className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-base font-extrabold text-blue-950" role="status">
                  {selectedIds.size} de 14 elegidos
                </p>
              )}
            </div>
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-300 bg-white">
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
                    className={`flex items-center justify-between gap-3 p-3 ${invalid ? "bg-amber-50" : selected ? "" : "bg-slate-100 text-slate-600"}`}
                  >
                    {preparation.reason === "too_many" && (
                      <input
                        type="checkbox"
                        aria-label={`${selected ? "Quitar" : "Elegir"} a ${p.name}`}
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
                      {Array.from({ length: 99 }, (_, n) => (
                        <option
                          key={n + 1}
                          value={n + 1}
                          disabled={caps.some(
                            (cap, index) =>
                              index !== i &&
                              selectedIds.has(preparation.players[index]?.id ?? "") &&
                              cap === n + 1,
                          )}
                        >
                          {n + 1}
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
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto max-w-lg">
                <p className="mb-2 text-sm text-slate-600" role="status">
                  {validCaps
                    ? `${selectedCaps.length} jugadores listos para abrir el acta.`
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
          <div role="status" aria-live="polite">
            <div className="mb-4 flex items-center gap-3">
              <Loader2 size={24} className="motion-safe:animate-spin" aria-hidden="true" />
              <h2 className="text-xl font-bold">Preparando tu acta…</h2>
            </div>
            <p className="text-base text-slate-600">
              Estamos recuperando la convocatoria y las jugadas guardadas.
            </p>
            <div
              aria-hidden="true"
              className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 motion-safe:animate-pulse"
            >
              <div className="h-14 rounded-lg bg-blue-100" />
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-3">
                  <div className="h-12 w-12 rounded-lg bg-slate-200" />
                  <div className="h-12 flex-1 rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

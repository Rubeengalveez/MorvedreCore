"use client";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, ChevronRight, Save, Search, X } from "lucide-react";

import { createSwimTime } from "@/server/actions/swim-times";
import { validCapNumber } from "@/lib/domain/cap-number";
import {
  describeSwimTime,
  formatSwimTime,
  normalizeSearchTerm,
  parseSwimTime,
} from "@/lib/domain/swim-times";

type Player = {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  squad_number: number | null;
};

type ExistingEntry = {
  id: string;
  revision: number;
  player_id: string;
  test_date: string;
  time_50_cs: number | null;
  time_100_cs: number | null;
};

interface SwimTimeEntryListProps {
  teamId: string;
  teamColor: string;
  players: Player[];
  today: string;
  existingEntries: ExistingEntry[];
}

export function SwimTimeEntryList({
  teamId,
  players,
  today,
  existingEntries,
}: SwimTimeEntryListProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [distance, setDistance] = useState<50 | 100>(50);
  const [minutesInput, setMinutesInput] = useState("");
  const [secondsInput, setSecondsInput] = useState("");
  const [hundredthsInput, setHundredthsInput] = useState("");
  const [search, setSearch] = useState("");
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<ExistingEntry[]>(existingEntries);
  const [isPending, startTransition] = useTransition();
  const operation = useRef<{ key: string; id: string } | null>(null);
  const busy = useRef(false);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.player_id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );
  const selectedCap = validCapNumber(selectedPlayer?.squad_number ?? selectedPlayer?.cap_number);

  const filteredPlayers = useMemo(() => {
    const query = normalizeSearchTerm(search);
    if (!query) return players;
    const cleanCapQuery = query.replace(/^#/, "");
    return players.filter((player) => {
      const nameMatch = normalizeSearchTerm(player.full_name).includes(query);
      const cap = validCapNumber(player.squad_number ?? player.cap_number);
      const capMatch = cap != null && cap.toString() === cleanCapQuery;
      return nameMatch || capMatch;
    });
  }, [players, search]);

  const timesTodayByPlayer = useMemo(() => {
    const map = new Map<string, { time50?: number; time100?: number }>();
    for (const entry of todayEntries) {
      const current = map.get(entry.player_id) ?? {};
      if (entry.time_50_cs != null && current.time50 == null) current.time50 = entry.time_50_cs;
      if (entry.time_100_cs != null && current.time100 == null) current.time100 = entry.time_100_cs;
      map.set(entry.player_id, current);
    }
    return map;
  }, [todayEntries]);

  const parsedTime = useMemo(() => {
    if (!minutesInput && !secondsInput && !hundredthsInput) return null;
    const minutes = Number(minutesInput || "0");
    const seconds = Number(secondsInput || "0");
    const hundredths = Number(hundredthsInput || "0");
    if (seconds > 59 || hundredths > 99) return null;
    return parseSwimTime(
      `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`,
      distance,
    );
  }, [distance, hundredthsInput, minutesInput, secondsInput]);

  const hasTimeInput = Boolean(minutesInput || secondsInput || hundredthsInput);

  function clearTime() {
    setMinutesInput("");
    setSecondsInput("");
    setHundredthsInput("");
  }

  function keepDigits(value: string, length: number) {
    return value.replace(/\D/g, "").slice(0, length);
  }

  function handleSelectPlayer(id: string) {
    setSelectedPlayerId(id);
    clearTime();
    setError("");
    setWarningAccepted(false);
  }

  function handleSave() {
    if (busy.current) return;
    if (!selectedPlayer) {
      setError("Selecciona primero un jugador.");
      return;
    }
    if (!parsedTime) {
      setError(
        hasTimeInput
          ? "Revisa el tiempo: los segundos deben estar entre 0 y 59."
          : "Escribe el tiempo antes de guardar.",
      );
      return;
    }
    if (!parsedTime.ok) {
      setError(parsedTime.message);
      return;
    }
    if (parsedTime.warning && !warningAccepted) {
      setWarningAccepted(true);
      setError("El tiempo es poco habitual. Revisa y pulsa GUARDAR otra vez para confirmar.");
      return;
    }

    setError("");
    const centiseconds = parsedTime.centiseconds;
    const time50Cs = distance === 50 ? centiseconds : null;
    const time100Cs = distance === 100 ? centiseconds : null;
    const key = JSON.stringify([teamId, selectedPlayer.player_id, today, time50Cs, time100Cs]);
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
    const operationId = operation.current.id;
    busy.current = true;

    startTransition(async () => {
      try {
        const result = await createSwimTime({
          teamId,
          playerId: selectedPlayer.player_id,
          operationId,
          testDate: today,
          time50Cs,
          time100Cs,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setTodayEntries((prev) => [
          {
            id: result.entryId,
            revision: result.revision,
            player_id: selectedPlayer.player_id,
            test_date: today,
            time_50_cs: time50Cs,
            time_100_cs: time100Cs,
          },
          ...prev,
        ]);

        const formatted = formatSwimTime(centiseconds);
        setSuccessBanner(
          `Guardado para ${selectedPlayer.full_name}: ${distance} m en ${formatted}.`,
        );
        clearTime();
        setWarningAccepted(false);
        operation.current = null;
      } catch {
        setError(
          "No pudimos confirmar el guardado. Vuelve a intentarlo; no se duplicará el tiempo.",
        );
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Banner de éxito grande */}
      {successBanner ? (
        <div
          role="status"
          className="text-paper flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-900 bg-emerald-800 p-4 text-base font-bold shadow-md"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-200" aria-hidden="true" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-emerald-700"
            aria-label="Cerrar aviso"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* PASO 1: Selección de Jugador */}
      <section
        className={`border-pool-deep/65 bg-paper-card rounded-2xl border shadow-xs ${selectedPlayer ? "p-2.5" : "p-4 sm:p-5"}`}
        aria-label={selectedPlayer ? "Jugador seleccionado" : undefined}
        aria-labelledby={selectedPlayer ? undefined : "step-player-heading"}
      >
        <div
          className={`items-center justify-between gap-3 ${selectedPlayer ? "hidden" : "mb-3 flex"}`}
        >
          <h2
            id="step-player-heading"
            className="text-pool-deep flex items-center gap-2 text-base font-black tracking-wide uppercase sm:text-lg"
          >
            <span className="bg-pool-deep text-paper flex h-6 w-6 items-center justify-center rounded-full text-xs font-black">
              1
            </span>
            {selectedPlayer ? "Jugador seleccionado" : "Elige el jugador"}
          </h2>
        </div>

        {selectedPlayer ? (
          /* Jugador seleccionado en tarjeta elegante y legible */
          <div className="bg-pool-foam/40 border-pool-blue/30 flex items-center justify-between gap-3 rounded-xl border p-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="bg-pool-deep text-paper flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-black shadow-xs">
                {selectedCap != null ? `#${selectedCap}` : selectedPlayer.full_name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink-900 min-w-0 text-base leading-snug font-extrabold sm:text-lg">
                  <AdaptivePlayerName name={selectedPlayer.full_name} />
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setSelectedPlayerId(null);
                clearTime();
                setError("");
              }}
              className="text-pool-blue hover:text-paper hover:bg-pool-blue bg-paper border-pool-deep/65 flex min-h-12 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-bold whitespace-nowrap shadow-xs transition-colors disabled:opacity-60"
              aria-label="Cambiar jugador seleccionado"
            >
              <span>Cambiar</span>
            </button>
          </div>
        ) : (
          /* Lista de selección de jugadores */
          <div className="flex flex-col gap-3">
            {players.length > 8 ? (
              <label className="relative block">
                <span className="sr-only">Buscar jugador</span>
                <Search
                  className="text-pool-blue pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="border-pool-deep/65 bg-paper text-ink-900 focus:border-pool-blue focus:ring-pool-blue h-12 w-full rounded-xl border pr-4 pl-11 text-base font-bold focus:ring-2 focus:outline-none"
                />
              </label>
            ) : null}

            {!filteredPlayers.length ? (
              <p
                role="status"
                className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-4 font-bold"
              >
                No encontramos a ese jugador. Prueba otro nombre o gorro.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredPlayers.map((player) => {
                const recorded = timesTodayByPlayer.get(player.player_id);
                const cap = validCapNumber(player.squad_number ?? player.cap_number);
                return (
                  <button
                    key={player.player_id}
                    type="button"
                    onClick={() => handleSelectPlayer(player.player_id)}
                    className="border-pool-deep/65 hover:border-pool-blue hover:bg-pool-foam/30 active:bg-pool-foam focus-visible:ring-pool-blue bg-paper flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition-all focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="bg-pool-deep text-paper flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-black">
                        {cap != null ? cap : player.full_name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-ink-900 block min-w-0 text-base font-extrabold">
                          <AdaptivePlayerName name={player.full_name} />
                        </span>
                        {recorded?.time50 != null || recorded?.time100 != null ? (
                          <span className="block text-sm font-bold text-emerald-800">
                            Hoy:{" "}
                            {recorded.time50 != null
                              ? `50m (${formatSwimTime(recorded.time50)})`
                              : ""}
                            {recorded.time50 != null && recorded.time100 != null ? " · " : ""}
                            {recorded.time100 != null
                              ? `100m (${formatSwimTime(recorded.time100)})`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* PASO 2 y 3: Distancia y Tiempo (Solo cuando hay jugador seleccionado) */}
      {selectedPlayer ? (
        <section
          className="border-pool-deep/65 bg-paper-card flex flex-col gap-3 rounded-2xl border p-3 shadow-xs sm:p-4"
          aria-labelledby="step-time-heading"
        >
          {/* Paso 2: Distancia */}
          <div>
            <h2
              id="step-time-heading"
              className="text-pool-deep mb-2 flex items-center gap-2 text-sm font-black tracking-wide uppercase sm:text-base"
            >
              <span className="bg-pool-deep text-paper flex h-6 w-6 items-center justify-center rounded-full text-xs font-black">
                2
              </span>
              Distancia
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isPending}
                aria-pressed={distance === 50}
                onClick={() => {
                  setDistance(50);
                  setWarningAccepted(false);
                  setError("");
                }}
                className={`flex min-h-12 touch-manipulation flex-col items-center justify-center rounded-xl border p-1.5 transition-all ${
                  distance === 50
                    ? "bg-pool-deep text-paper border-pool-deep ring-pool-deep/20 shadow-xs ring-2"
                    : "bg-paper text-ink-700 border-pool-deep/65 hover:border-pool-deep/65"
                }`}
              >
                <span className="text-lg font-black tracking-wide sm:text-xl">50 m</span>
                <span className="hidden text-xs font-bold tracking-wider uppercase opacity-80 sm:block">
                  2 largos
                </span>
              </button>

              <button
                type="button"
                disabled={isPending}
                aria-pressed={distance === 100}
                onClick={() => {
                  setDistance(100);
                  setWarningAccepted(false);
                  setError("");
                }}
                className={`flex min-h-12 touch-manipulation flex-col items-center justify-center rounded-xl border p-1.5 transition-all ${
                  distance === 100
                    ? "bg-pool-deep text-paper border-pool-deep ring-pool-deep/20 shadow-xs ring-2"
                    : "bg-paper text-ink-700 border-pool-deep/65 hover:border-pool-deep/65"
                }`}
              >
                <span className="text-lg font-black tracking-wide sm:text-xl">100 m</span>
                <span className="hidden text-xs font-bold tracking-wider uppercase opacity-80 sm:block">
                  4 largos
                </span>
              </button>
            </div>
          </div>

          {/* Paso 3: Tiempo */}
          <div>
            <h2 className="text-pool-deep mb-2 flex items-center gap-2 text-sm font-black tracking-wide uppercase sm:text-base">
              <span className="bg-pool-deep text-paper flex h-6 w-6 items-center justify-center rounded-full text-xs font-black">
                3
              </span>
              Tiempo conseguido
            </h2>

            <div className="bg-paper-sunk border-pool-deep/65 flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 sm:p-3">
              <div className="grid w-full max-w-sm grid-cols-[0.85fr_1fr_1.2fr] gap-1 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-center">
                  <span className="text-pool-deep text-sm font-bold">Minutos</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isPending}
                    value={minutesInput}
                    onChange={(event) => {
                      setMinutesInput(keepDigits(event.target.value, 2));
                      setError("");
                      setWarningAccepted(false);
                    }}
                    placeholder="0"
                    aria-label="Minutos"
                    className="bg-paper text-pool-deep border-pool-blue focus:ring-pool-blue/20 h-12 w-full rounded-xl border-2 text-center font-mono text-2xl font-black tabular-nums shadow-inner focus:ring-4 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-center">
                  <span className="text-pool-deep text-sm font-bold">Segundos</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isPending}
                    value={secondsInput}
                    onChange={(event) => {
                      setSecondsInput(keepDigits(event.target.value, 2));
                      setError("");
                      setWarningAccepted(false);
                    }}
                    placeholder={distance === 50 ? "34" : "15"}
                    aria-label="Segundos"
                    className="bg-paper text-pool-deep border-pool-blue focus:ring-pool-blue/20 h-12 w-full rounded-xl border-2 text-center font-mono text-2xl font-black tabular-nums shadow-inner focus:ring-4 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-center">
                  <span className="text-pool-deep text-sm font-bold">Centésimas</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isPending}
                    value={hundredthsInput}
                    onChange={(event) => {
                      setHundredthsInput(keepDigits(event.target.value, 2));
                      setError("");
                      setWarningAccepted(false);
                    }}
                    placeholder="00"
                    aria-label="Centésimas"
                    className="bg-paper text-pool-deep border-pool-blue focus:ring-pool-blue/20 h-12 w-full rounded-xl border-2 text-center font-mono text-2xl font-black tabular-nums shadow-inner focus:ring-4 focus:outline-none"
                  />
                </label>
              </div>

              {parsedTime?.ok ? (
                <p className="mt-1 text-center text-base font-extrabold text-emerald-700 sm:text-lg">
                  ✓ {describeSwimTime(parsedTime.centiseconds)}
                </p>
              ) : (
                <p className="mt-1 text-center text-sm font-bold text-slate-700">
                  Las centésimas son opcionales
                </p>
              )}
            </div>
          </div>

          {/* Mensajes de error o confirmación */}
          {error ? (
            <div
              role="alert"
              className={`rounded-xl p-3.5 text-base font-bold ${
                warningAccepted
                  ? "border-2 border-amber-800 bg-amber-100 text-amber-900"
                  : "border-2 border-rose-800 bg-rose-100 text-rose-900"
              }`}
            >
              {error}
            </div>
          ) : null}

          {/* Paso 4: Botón Guardar */}
          <button
            type="button"
            disabled={isPending || !hasTimeInput}
            onClick={handleSave}
            className={`text-paper flex min-h-12 w-full touch-manipulation items-center justify-center gap-2.5 rounded-xl text-base font-black shadow-md transition-all sm:text-lg ${
              isPending || !hasTimeInput
                ? "bg-ink-300 cursor-not-allowed opacity-60"
                : "bg-pool-deep hover:bg-pool-blue active:scale-[0.98]"
            }`}
          >
            <Save className="h-6 w-6" aria-hidden="true" />
            {isPending
              ? "Guardando..."
              : warningAccepted
                ? "Confirmar y Guardar Tiempo"
                : "GUARDAR TIEMPO"}
          </button>
        </section>
      ) : null}

      {selectedPlayer ? (
        <section className="border-pool-deep/65 bg-paper-card rounded-2xl border p-3 shadow-xs">
          <h2 className="text-pool-deep text-sm font-black tracking-wide uppercase">
            Tiempos de hoy
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([50, 100] as const).map((meters) => {
              const recorded = timesTodayByPlayer.get(selectedPlayer.player_id);
              const value = meters === 50 ? recorded?.time50 : recorded?.time100;
              return (
                <div
                  key={meters}
                  className={`flex min-h-14 items-center justify-between rounded-xl border px-3 ${
                    value == null
                      ? "border-pool-deep/65 bg-paper-sunk text-slate-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <span className="font-black">{meters} m</span>
                  <span className="text-sm font-extrabold tabular-nums">
                    {value == null ? "Pendiente" : formatSwimTime(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Historial de tiempos registrados hoy */}
      {todayEntries.length > 0 && !selectedPlayer ? (
        <section
          className="border-pool-deep/65 bg-paper-card rounded-2xl border p-4 shadow-sm sm:p-5"
          aria-labelledby="today-times-heading"
        >
          <h2
            id="today-times-heading"
            className="text-pool-deep mb-3 flex items-center justify-between text-base font-black tracking-wider uppercase sm:text-lg"
          >
            <span>Tiempos registrados hoy ({todayEntries.length})</span>
          </h2>

          <div className="space-y-3 p-3">
            {todayEntries.map((entry) => {
              const player = players.find((p) => p.player_id === entry.player_id);
              const name = player?.full_name ?? "Jugador";
              const cap = validCapNumber(player?.squad_number ?? player?.cap_number);
              return (
                <div
                  key={entry.id}
                  className="border-pool-deep/65 flex flex-col gap-3 rounded-xl border-2 p-3 text-base"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="bg-pool-foam text-pool-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black">
                      {cap != null ? `#${cap}` : "•"}
                    </span>
                    <span className="text-ink-900 min-w-0 font-extrabold">
                      <AdaptivePlayerName name={name} />
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {entry.time_50_cs != null ? (
                      <span className="bg-pool-deep text-paper rounded-lg px-2.5 py-1 text-sm font-black tabular-nums sm:text-base">
                        50m: {formatSwimTime(entry.time_50_cs)}
                      </span>
                    ) : null}
                    {entry.time_100_cs != null ? (
                      <span className="bg-pool-deep text-paper rounded-lg px-2.5 py-1 text-sm font-black tabular-nums sm:text-base">
                        100m: {formatSwimTime(entry.time_100_cs)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
